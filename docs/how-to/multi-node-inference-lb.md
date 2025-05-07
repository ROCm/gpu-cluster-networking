# Multi-Node Inference Load Balancing

This guide describes how to set up a scalable multi-node LLM inference cluster.

## Architecture Overview

This solution implements a distributed LLM inference system with three main components:

* **Inference Pool**: Multiple inference nodes running vLLM or SGLang servers on AMD GPUs using tensor parallelism
* **API Gateway Layer**: Choose the load balancer solution that supports your operational requirements. This guide demonstrates these options:
  * A [LiteLLM](https://docs.litellm.ai/docs/)-based load balancer
  * An [nginx](https://nginx.org/)-based load balancer
* **Monitoring Layer**: Prometheus and Grafana for metrics collection and visualization

This architecture allows horizontal scaling by adding more inference nodes while maintaining a single API endpoint for client applications. The system supports various model sizes:

* **Small Models**: Can run efficiently on a single GPU
* **Medium Models**: Typically require 2+ GPUs with tensor parallelism
* **Large Models**: Requires multi-node deployments for high availability

**Tensor Parallelism** distributes model layers across multiple GPUs, allowing inference of models too large to fit in a single GPU's memory. The `--tensor-parallel-size` (`-tp`) parameter determines how many GPUs will share the model weights.

### Logical Diagram

```{mermaid}
flowchart TD
    clients["Client Applications"] --> gateway["API Gateway Layer"]
    gateway -->node1 & node2 & nodeN

    subgraph "Inference Nodes"
        node1["Inference Node 1"]
        node2["Inference Node 2"]
        nodeN["Inference Node N"]
    end
    
    classDef main fill:#f9f9f9,stroke:#333,stroke-width:2px
    classDef gateway fill:#9cf,stroke:#333
    classDef nodes fill:#f96,stroke:#333
    
    class clients,gateway,inference main
    class node1,node2,nodeN nodes
```

## Prerequisites

* Multiple nodes with AMD GPUs supporting ROCm
* Docker and Docker Compose installed on all nodes
* Network connectivity between nodes
* Models downloaded to a shared or local storage location

### NUMA Configuration

Before starting the inference servers, it's recommended to disable automatic NUMA balancing on each node for optimal performance:

```bash
# Disable automatic NUMA balancing
sudo sh -c 'echo 0 > /proc/sys/kernel/numa_balancing'

# Verify NUMA balancing is disabled (should return 0)
cat /proc/sys/kernel/numa_balancing
```

## Deployment

This section describes the steps needed to deploy the required components for multi-node inference load balancing.

### Project Structure

```text
/llm-cluster/
├── nodes/                # Inference node files
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

### Inference Pool Setup

**On each inference node:**

Create the directory structure:

```bash
mkdir -p ~/llm-cluster/nodes
cd ~/llm-cluster/nodes
```

Create a `docker-compose.yml` file for the inference nodes:

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
    image: lmsysorg/sglang:v0.4.6.post2-rocm630
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

Start the inference services:

```bash
docker-compose up -d
```

### API Gateway Setup

On the API Gateway node, create the gateway directory structure:

```bash
mkdir -p ~/llm-cluster/gateway
cd ~/llm-cluster/gateway
```

#### Option 1: LiteLLM-based Load Balancer

LiteLLM provides routing, load balancing, and observability for LLM API calls, supporting multiple LLM providers and models through a unified interface.

Create `docker-compose.yml` for LiteLLM:

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

Start the LiteLLM gateway:

```bash
docker-compose up -d
```

#### Option 2: Nginx-based Load Balancer

Nginx provides a high-performance, scalable HTTP server and reverse proxy that can efficiently distribute traffic across multiple inference nodes.

Create `nginx.conf`:

```nginx
worker_processes auto;
worker_rlimit_nofile 65535;
events {
    worker_connections 65535;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout 65;

    # Define upstream server group
    upstream vllm_pool {
        # Use least_conn for distributing traffic based on least number of current connections
        least_conn;
        
        # Add inference server entries - update with your node hostnames/IPs
        server node0:8000;
        server node1:8000;
        # Add additional nodes as needed
        # server nodeN:8000;
        
        keepalive 32;
    }

    server {
        listen 80;
        
        # Health check endpoint
        location /health {
            return 200 'healthy\n';
            add_header Content-Type text/plain;
        }

        # API endpoint for frontend clients
        location / {
            proxy_pass http://vllm_pool;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            
            # Timeouts for long-running inference requests
            proxy_connect_timeout 300s;
            proxy_read_timeout 300s;
            proxy_send_timeout 300s;
            
            # Buffer settings for large responses
            proxy_buffer_size 16k;
            proxy_buffers 8 16k;
            proxy_busy_buffers_size 32k;
        }
    }
}
```

Create `docker-compose.yml` for Nginx:

```yaml
services:
  nginx:
    image: nginx:latest
    container_name: nginx_gateway
    network_mode: host
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Start the Nginx gateway:

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

Create `docker-compose.yml` for monitoring:

```yaml
version: '3.8'


services:
  device-metrics-exporter:
    image: rocm/device-metrics-exporter:v1.2.1
    container_name: device-metrics-exporter
    restart: unless-stopped
    devices:
      - /dev/kfd
      - /dev/dri
    ports:
      - "5000:5000"

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
  # Inference servers
  - job_name: 'vllm'
    metrics_path: /metrics
    scrape_interval: 15s
    static_configs:
      - targets: ['node0:8000', 'node1:8000'] # Add additional nodes as needed
        labels:
          service: 'vllm'

  # LiteLLM Gateway metrics (if using LiteLLM)
  - job_name: 'litellm'
    metrics_path: /metrics
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:4000']
        labels:
          service: 'litellm_gateway'
  
  # Nginx Gateway metrics (if using Nginx with nginx-prometheus-exporter)
  - job_name: 'nginx'
    scrape_interval: 15s
    metrics_path: /metrics
    static_configs:
      - targets: ['localhost:9113']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'nginx-gateway'

  # AMD GPU device metrics
  - job_name: 'amd_gpu_metrics'
    scrape_interval: 5s
    metrics_path: /metrics
    static_configs:
      - targets: ['node0:5000', 'node1:5000']
        labels:
          service: 'amd_gpu_metrics'        
```

> **Note:** Replace `node0` and `node1` with the hostname or IP address of your inference nodes

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

### Gateway-Specific Monitoring Setup

#### For LiteLLM Gateway

LiteLLM includes built-in metrics that can be viewed in the Grafana dashboard. No additional configuration is needed beyond the Prometheus scrape configuration above.

#### For Nginx Gateway

To monitor Nginx, you can add the nginx-prometheus-exporter to your gateway setup:

* Update the `docker-compose.yml` for Nginx to include the exporter:

```yaml
services:
  nginx:
    image: nginx:latest
    container_name: nginx_gateway
    network_mode: host
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  nginx-exporter:
    image: nginx/nginx-prometheus-exporter:latest
    container_name: nginx_exporter
    command:
      - -nginx.scrape-uri=http://localhost/metrics
      - -nginx.retries=5
      - -web.listen-address=:9113      
    network_mode: host
    restart: unless-stopped
    depends_on:
      - nginx
```

Add a status endpoint to your `nginx.conf`:

```text
# Inside the server block, add:
location /metrics {
    stub_status on;
    access_log off;
    allow 127.0.0.1;
    deny all;
}
```

## Test the Multi-Node Serving Configuration

### Testing with LiteLLM Gateway

Send one request to the LiteLLM endpoint at localhost:4000

```bash
curl http://localhost:4000/v1/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secret_master_key" \
  -d '{"model": "DeepSeek-R1", "prompt": "What is AMD Instinct?", "max_tokens": 256, "temperature": 0.0}'
```

### Testing with Nginx Gateway

Send one request to the Nginx endpoint at localhost:80

```bash
curl http://localhost:80/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "DeepSeek-R1", "prompt": "What is AMD Instinct?", "max_tokens": 256, "temperature": 0.0}'
```

Expected output:

```json
{
  "text": [
    "What is AMD Instinct? AMD Instinct is a line of high-performance computing (HPC) and 
    artificial intelligence (AI) accelerators designed for datacenter and cloud computing 
    applications. It is based on AMDs Radeon Instinct architecture, which is optimized for HPC
     and AI workloads. AMD Instinct accelerators are designed to provide high-performance 
     computing and AI acceleration for a wide range of applications, including scientific simulations, 
     data analytics, machine learning, and deep learning.
     
     AMD Instinct accelerators are based on AMDs Radeon Instinct architecture, which is designed 
     to provide high-performance computing and AI acceleration. They are built on a 7nm process node 
     and feature a high-performance GPU core, as well as a large amount of memory and bandwidth to 
     support high-performance computing and AI workloads.
     
     AMD Instinct accelerators are designed to be used in a variety of applications, including:
     Scientific simulations: AMD Instinct accelerators can be used to accelerate complex scientific 
     simulations, such as weather forecasting, fluid dynamics, and molecular dynamics.
     Data analytics: AMD Instinct accelerators can be used to accelerate data analytics workloads,
     such as data compression, data encryption, and data mining.
     Machine learning: AMD Instinct accelerators can be used to accelerate machine learning workloads"
  ]
}
```

## Benchmark the multi-node inference pool

Use Apache Bench to simulate 1000+ of users per minute

### Option 1: Install Apache Bench Locally

This option requires sudo access.

Apache Bench is a stand-alone application and has no dependencies on the Apache web server installation.

```bash
sudo apt-get update
sudo apt-get install apache2-utils
```

### Option 2: Run Apache Bench in a Container

```bash
docker run -it --rm \
  --shm-size=8GB \
  --ipc=host \
  --network=host \
  --entrypoint bash \
  ubuntu/apache2:2.4-22.04_beta
```

### Create a Postdata File

Create a file named `postdata` with prompt request

```json
{"model": "DeepSeek-R1", "prompt": "What is AMD Instinct?", "max_tokens": 256, "temperature": 0.0}
```

### Start Apache Bench

Simulate 1000 user requests using following command

```bash
ab -n 1000 -c 100 -T application/json -p postdata -H "Authorization: Bearer your_secret_master_key" http://localhost:4000/v1/completions
```

Parameters:

* `-n 1000` → Number of requests to perform
* `-c 100` → Number of multiple requests to make at a time
* `-T` → Content-type header to use for POST/PUT data
* `-p` → File containing data to POST. Remember also to set -T
* `-H` → Add authorization header with your LiteLLM API key

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
