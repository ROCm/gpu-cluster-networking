.. meta::
   :description: How to perform network validation testing on optimized hardware
   :keywords: network validation, DCGPU, PCIe, Infiniband, RoCE, ROCm, RCCL, machine learning, LLM, usage, tutorial

********************************************************************
Cluster network performance validation for AMD Instinct accelerators
********************************************************************

When running HPC and AI applications in a cluster network environment,
performance is only as fast as the slowest individual node in the network. To
achieve optimal performance, each server must be configured for maximum data
transfer rates and bandwidth utilization based on the available hardware. It is
crucial to validate both host and device performance in single-node and
multi-node environments using the appropriate benchmarking tools.

Refer to the relevant networking guides for step-by-step instructions on
validating network configurations in single-node and multi-node environments.
These guides cover system settings, device configurations, networking tools, and
performance tests to ensure AMD Instinct™-powered GPU clusters achieve
optimal speed and bandwidth during operation.

.. grid:: 2
   :gutter: 3

   .. grid-item-card:: How to

      * :doc:`Single-node network configuration <how-to/single-node-config>`
      * :doc:`Multi-node network configuration <how-to/multi-node-config>`

   .. grid-item-card:: Reference

      * :doc:`reference/hardware-support`

.. note::

   AMD Instinct systems vary in form and configuration, and cluster design
   adds additional layers of complexity. The guidelines in this
   documentation are written at a high level for broad applicability across
   diverse environments. While certain scenarios may include specific hardware
   examples, your setup will likely differ in terms of GPUs and CPUs per server,
   firmware versions, and network interconnects. Adjustments might be necessary
   to align with your particular configuration.
