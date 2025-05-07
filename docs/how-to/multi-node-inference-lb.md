# Multi-Node Inference Load Balancing

This guide describes how to set up a scalable multi-node LLM inference cluster.

## Architecture Overview

This solution implements a distributed LLM inference system with three main components:

* **Backend Layer**: Multiple inference nodes running vLLM or SGLang servers on AMD GPUs using tensor parallelism
* **API Gateway Layer**A LiteLLM-based load balancer that distributes requests across backend nodes
* **Monitoring Layer**: Prometheus and Grafana for metrics collection and visualization

This architecture allows horizontal scaling by adding more backend nodes while maintaining a single API endpoint for client applications. The system supports various model sizes:

* **Small Models**: Can run efficiently on a single GPU
* **Medium Models**: Typically require 2+ GPUs with tensor parallelism
* **Large Models**: Requires multi-node deployments for high availability

**Tensor Parallelism** distributes model layers across multiple GPUs, allowing inference of models too large to fit in a single GPU's memory. The `--tensor-parallel-size` (`-tp`) parameter determines how many GPUs will share the model weights.

## Prerequisites

* Multiple nodes with AMD GPUs supporting ROCm
* Docker and Docker Compose installed on all nodes
* Network connectivity between nodes
* Models downloaded to a shared or local storage location

## NUMA Configuration

Before starting the inference servers, it's recommended to disable automatic NUMA balancing on each node for optimal performance:

```bash
# Disable automatic NUMA balancing
sudo sh -c 'echo 0 > /proc/sys/kernel/numa_balancing'

# Verify NUMA balancing is disabled (should return 0)
cat /proc/sys/kernel/numa_balancing
```

## Project Structure

```text
/llm-cluster/
├── backend/                # Backend inference node files
│   ├── docker-compose.yml
│   └── .env               # GPU and model configurations
├── gateway/               # API Gateway/Load Balancer files
│   ├── docker-compose.yml
│   ├── config.yaml       
│   └── .env              # API keys and settings
└── monitoring/           # Monitoring stack files
    ├── docker-compose.yml
    ├── prometheus/
    │   └── prometheus.yml
    └── grafana/
        └── datasources.yml
```

## Backend Layer Setup

**On each inference node:**

Create the backend directory structure:

```bash
mkdir -p ~/llm-cluster/backend
cd ~/llm-cluster/backend
```

Create `docker-compose.yml`:

```yaml
services:
  vllm:
    image: rocm/vllm:instinct_main
    container_name: vllm_${NODE_ID:-node1}
    shm_size: ${SHM_SIZE:-32GB}
    ipc: host
    network_mode: host
    devices:
      - /dev/kfd
      - /dev/dri
    group_add:
      - video
    security_opt:
      - seccomp=unconfined
    volumes:
      - ${MODEL_PATH}:/data/models
    environment:
      - ROCR_VISIBLE_DEVICES=${GPU_DEVICES:-0,1,2,3}
    command: >
      vllm serve /data/models/${MODEL_NAME}
      --dtype float16
      --tensor-parallel-size ${TP_SIZE:-4}
      --port ${PORT:-8000}
    restart: unless-stopped

  sglang:
    image: lmsysorg/sglang:v0.4.4.post1-rocm630
    container_name: sglang_${NODE_ID:-node1}
    shm_size: ${SHM_SIZE:-32GB}
    ipc: host
    network_mode: host
    devices:
      - /dev/kfd
      - /dev/dri
    group_add:
      - video
    security_opt:
      - seccomp=unconfined
    volumes:
      - ${MODEL_PATH}:/data/models
    environment:
      - ROCR_VISIBLE_DEVICES=${GPU_DEVICES:-0,1,2,3}
      - RCCL_MSCCL_ENABLE=0
      - CK_MOE=1
      - HSA_NO_SCRATCH_RECLAIM=1
    command: >
      python3 -m sglang.launch_server
      --model /data/models/${MODEL_NAME}
      --tp ${TP_SIZE:-4}
      --trust-remote-code
      --port ${PORT:-8000}
      --enable-metrics
    restart: unless-stopped
```

Create `.env`:

```bash
NODE_ID=node1
MODEL_PATH=/path/to/models
MODEL_NAME=Llama-3.1-8B-Instruct
TP_SIZE=4
GPU_DEVICES=0,1,2,3
PORT=8000
SHM_SIZE=32GB
```

Start the backend services:

```bash
docker-compose up -d
```

## API Gateway Setup

On the head node:

Create the gateway directory structure:

```bash
mkdir -p ~/llm-cluster/gateway
cd ~/llm-cluster/gateway
```

Create `docker-compose.yml`:

```yaml
services:
  litellm:
    image: ghcr.io/berriai/litellm:main-stable
    container_name: litellm_gateway
    network_mode: host
    volumes:
      - ./config.yaml:/app/config.yaml
    command: ["--config", "/app/config.yaml", "--port", "4000", "--num_workers", "8"]
    environment:
      LITELLM_MASTER_KEY: "${LITELLM_MASTER_KEY}"
    env_file: .env
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Create `config.yaml`:

```yaml
model_list:
  - model_name: DeepSeek-R1
    litellm_params:
      model: openai/huggingface/deepseek-ai/DeepSeek-R1
      api_base: http://node0:8000/v1
  
  - model_name: DeepSeek-R1
    litellm_params:
      model: openai/huggingface/deepseek-ai/DeepSeek-R1
      api_base: http://node1:8000/v1

  # Add additional nodes as needed
  # - model_name: DeepSeek-R1
  #   litellm_params:
  #     model: openai/huggingface/deepseek-ai/DeepSeek-R1
  #     api_base: http://nodeN:8000/v1

# Configure load balancing
router_settings:
  routing_strategy: least-busy
  api_base: http://0.0.0.0:4000
  num_retries: 3
  timeout: 300
```

Create `.env`:

```bash
LITELLM_MASTER_KEY=your_secret_master_key
```

Start the gateway services:

```bash
docker-compose up -d
```

## Monitoring Stack Setup

**On the monitoring node:**

Create the monitoring directory structure:

```bash
mkdir -p ~/llm-cluster/monitoring/{prometheus,grafana}
cd ~/llm-cluster/monitoring
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--web.listen-address=:9091'
    ports:
      - "9091:9091"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    volumes:
      - ./grafana/datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  grafana_data:
```

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'vllm'
    static_configs:
      - targets: ['node1:8000', 'node2:8000']
```

```{note}
Replace `node1` and `node2` with the hostname or IP address of your nodes
```

Create `datasources.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9091
    isDefault: true
```

Start the monitoring services:

```bash
docker-compose up -d
```

## Test the Multi-Node Serving Configuration

Send one request to the LiteLLM endpoint at localhost:4000

```bash
curl http://localhost:4000/v1/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secret_master_key" \
  -d '{"model": "DeepSeek-R1", "prompt": "What is AMD Instinct?", "max_tokens": 256, "temperature": 0.0}'
```

Expected output:

```json
{
  "text": [
    "What is AMD Instinct? AMD Instinct is a line of high-performance computing (HPC) and artificial intelligence (AI) accelerators designed for datacenter and cloud computing applications. It is based on AMDs Radeon Instinct architecture, which is optimized for HPC and AI workloads. AMD Instinct accelerators are designed to provide high-performance computing and AI acceleration for a wide range of applications, including scientific simulations, data analytics, machine learning, and deep learning.nAMD Instinct accelerators are based on AMDs Radeon Instinct architecture, which is designed to provide high-performance computing and AI acceleration. They are built on a 7nm process node and feature a high-performance GPU core, as well as a large amount of memory and bandwidth to support high-performance computing and AI workloads.\nAMD Instinct accelerators are designed to be used in a variety of applications, including:\nScientific simulations: AMD Instinct accelerators can be used to accelerate complex scientific simulations, such as weather forecasting, fluid dynamics, and molecular dynamics.\nData analytics: AMD Instinct accelerators can be used to accelerate data analytics workloads, such as data compression, data encryption, and data mining.\nMachine learning: AMD Instinct accelerators can be used to accelerate machine learning workloads, such as neural network training and"
  ]
}
```

## Benchmark the multi-node serving backend

Use Apache Bench to simulate 1000+ of users per minute

### 1. Install Apache Bench (option 1)

This option requires sudo access.

Apache Bench is a stand-alone application and has no dependencies on the Apache web server installation.

```bash
sudo apt-get update
sudo apt-get install apache2-utils
```

### 2. Start Apache server container using following command (Option 2)

```bash
docker run -it --rm \
  --shm-size=8GB \
  --ipc=host \
  --network=host \
  --privileged --cap-add=CAP_SYS_ADMIN \
  --entrypoint bash \
  ubuntu/apache2:2.4-22.04_beta
```

### 3. Create a file named "postdata" with prompt request

```json
{"model": "DeepSeek-R1", "prompt": "What is AMD Instinct?", "max_tokens": 256, "temperature": 0.0}
```

### 4. Simulate 1000 user requests using following command

```bash
ab -n 1000 -c 100 -T application/json -p postdata -H "Authorization: Bearer your_secret_master_key" http://localhost:4000/v1/completions
```

Parameters:

* `-n 1000` → Number of requests to perform
* `-c 100` → Number of multiple requests to make at a time
* `-T` → Content-type header to use for POST/PUT data
* `-p` → File containing data to POST. Remember also to set -T
* `-H` → Add authorization header with your LiteLLM API key

## Prometheus and Grafana

Prometheus metric logging is enabled by default in the vLLM OpenAI-compatible server.

To connect vLLM metric logging to Prometheus and Grafana, follow these steps on the head node:

### Install Prometheus

Download Prometheus stable release binaries for desired architecture such as:

```bash
wget https://github.com/prometheus/prometheus/releases/download/v3.2.1/prometheus-3.2.1.linux-amd64.tar.gz
```

Untar downloaded file

```bash
tar -xvf prometheus-3.2.1.linux-amd64.tar.gz
```

Update prometheus.yaml file to include nodes running the inference framework:

```bash
cd prometheus-3.2.1.linux-amd64/
vi prometheus.yaml
```

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'vllm'
    static_configs:
      - targets: ['useocpm2m-386-001:8000', 'useocpm2m-386-004:8000']
```

Run Prometheus on desired port:

```bash
./prometheus --web.listen-address=:9091
```

### Install Grafana

Download and install Grafana:

```bash
wget https://dl.grafana.com/enterprise/release/grafana-enterprise-11.5.2.linux-amd64.tar.gz
tar -xvf grafana-enterprise-11.5.2.linux-amd64.tar.gz
cd grafana-v11.5.2/bin/
./grafana server
```

### Configure Grafana Dashboard

1. Navigate to http://localhost:3000. Log in with the default username (admin) and password (admin).

2. Add Prometheus Data Source:
   - Go to http://localhost:3000/connections/datasources/new 
   - Select Prometheus

3. Import Dashboard:
   - Go to http://localhost:3000/dashboard/import
   - Upload grafana.json from https://docs.vllm.ai/en/latest/getting_started/examples/prometheus_grafana.html
   - Select the prometheus datasource

### Performance Examples

The following examples show inference throughput (measured in tokens per second) in Grafana when scaling from one to four nodes while routing requests through an API Gateway:

```bash
# Request command 1 (Llama-3.1-8B-Instruct)
ab -n 20000 -c 2000 -T application/json -p postdata http://localhost:80/v1/completions

# Request command 2 (Llama-3.1-405B-Instruct)
ab -n 20000 -c 2000 -T application/json -p postdata http://localhost:80/v1/completions

# Request command 3 (DeepSeek-R1)
ab -n 20000 -c 2000 -T application/json -p postdata http://localhost:80/v1/completions
```
