# GPU Cluster Networking Documentation

This repository contains instructions for configuring and validating cluster networks utilizing AMD GPUs, ROCm, and other necessary tools.

## Building the documentation

To build quickly, use the code below. For more options and detail, refer to [ROCm page on building documentation](https://rocm.docs.amd.com/en/latest/contribute/building.html).

```
cd docs

pip3 install -r sphinx/requirements.txt

python3 -m sphinx -T -E -b html -d _build/doctrees -D language=en . _build/html
```
