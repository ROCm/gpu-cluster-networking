.. meta::
   :description: How to perform network validation testing on optimized hardware
   :keywords: network validation, DCGPU, PCIe, Infiniband, RoCE, ROCm, RCCL, machine learning, LLM, usage, tutorial

************************************************************************
Cluster Network Performance Validation for AMD Instinct GPU Accelerators
************************************************************************

When running AI/HPC applications in a cluster network environment, performance is only as fast as the slowest individual node. It is therefore imperative that you configure each server for maximum data transfer rate and bandwidth usage with respect to hardware, then validate host and device-based performance over your network in single and multi node capacities with the appropriate benchmarking tools. 

Refer to the appropriate networking guides for the necessary steps to validate your network configuration in single and multi node capacities. Each guide includes detailed instructions on system settings, device configuration, networking tools, and performance tests to help you verify your AMD Instinct™-powered GPU clusters are getting optimal speeds and bandwidths during operation.

.. grid:: 2
    :gutter: 3

    .. grid-item-card:: How to

        * :doc:`Single node network configuration for AMD Instinct GPUs<how-to/single-node-config>`
        * :doc:`Multi node network configuration for AMD Instinct GPUs<how-to/multi-node-config>`

    .. grid-item-card:: Reference

        * :doc:`reference/hardware-support`

.. note::
   AMD Instinct™ systems come in many shapes and sizes, and cluster design adds yet another dimension of configuration to consider. These instructions are written at a sufficiently high level to ensure they can be followed for as many environments as possible. While some scenarios do provide specific examples of hardware, know that your configuration is likely to differ from what is being demonstrated in terms of GPUs and CPUs per server, firmware versions, and network interconnect fabric.