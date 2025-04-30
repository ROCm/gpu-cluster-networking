.. meta::
   :description: AMD Instinct accelerator compatibility with network cards.
   :keywords: network validation, DCGPU, PCIe, Infiniband, RoCE, card, compatibility

************************************************************************************************************************
Hardware support matrix
************************************************************************************************************************

This page provides information on hardware that has been verified to work as expected with the directions for single and
multi-node network validation defined elsewhere on this site. 

GPU Architecture
========================================================================================================================

The GPU workloads and benchmarks specified in the :doc:`Single Node </how-to/single-node-config>` and
:doc:`Multi-node </how-to/multi-node-config>` networking guides should work as written on the following microarchitectures,
presuming a :doc:`supported version <rocm:compatibility/compatibility-matrix>` of ROCm.

.. _MI325X-support:

MI325X
------------------------------------------------------------------------------------------------------------------------

MI325X GPUs requires ROCm 6.3.1 or higher when running GPU applications, as this is the earliest version of ROCm where MI325X
has `explicit support <https://rocm.docs.amd.com/en/docs-6.3.1/reference/gpu-arch-specs.html>`_. Attempts to run
workloads with earlier ROCm versions are unsuccessful on MI325X.

MI300X
------------------------------------------------------------------------------------------------------------------------

MI300X GPUs can run all specified workloads and benchmarks in the networking guides presuming a
supported version of ROCm.

Pre-MI300X
------------------------------------------------------------------------------------------------------------------------

MI200X and MI100X series GPUs can run all specified workloads and benchmarks in the networking guides presuming a
supported version of ROCm.


Supported NICs
========================================================================================================================

When deploying ROCm, compatibility between the accelerators and NICs is critical for ensuring optimized data transfer in
high-performance computing environments. The following NICs have been validated for use with AMD Instinct MI300X, MI200,
and MI100 accelerators, supporting high-speed interconnects like RoCE v2 (RDMA over Converged Ethernet) and InfiniBand
for low-latency, high-throughput communication.

The processes detailed in these guides are validated to run on the following hardware with AMD Instinct™ accelerators:

NICs for AMD Instinct MI325X
------------------------------------------------------------------------------------------------------------------------

+--------------------------+--------------+----------------------+
| Product name             | Speed (GB/s) | Interconnect         |
+==========================+==============+======================+
| AMD Pollara 400 Card     | 400          | RoCEv2               |
+--------------------------+--------------+----------------------+
| Broadcom P2200G          | 400          | RoCE v2              |
+--------------------------+--------------+----------------------+
| Broadcom P1400GD         | 400          | RoCE v2              |
+--------------------------+--------------+----------------------+
| Broadcom N1400GD         | 400          | RoCE v2              |
+--------------------------+--------------+----------------------+
| Broadcom N2200G          | 400          | RoCE v2              |
+--------------------------+--------------+----------------------+
| NVIDIA ConnectX-7 series | 400          | RoCE v2 / InfiniBand |
+--------------------------+--------------+----------------------+

NICs for AMD Instinct MI300X
------------------------------------------------------------------------------------------------------------------------

+--------------------------+--------------+----------------------+
| Product name             | Speed (GB/s) | Interconnect         |
+==========================+==============+======================+
| AMD Pollara 400 Card     | 400          | RoCEv2               |
+--------------------------+--------------+----------------------+
| Broadcom P2200G          | 400          | RoCE v2              |
+--------------------------+--------------+----------------------+
| Broadcom P1400GD         | 400          | RoCE v2              |
+--------------------------+--------------+----------------------+
| Broadcom N1400GD         | 400          | RoCE v2              |
+--------------------------+--------------+----------------------+
| Broadcom N2200G          | 400          | RoCE v2              |
+--------------------------+--------------+----------------------+
| NVIDIA ConnectX-7 series | 400          | RoCE v2 / InfiniBand |
+--------------------------+--------------+----------------------+

NICs for AMD Instinct MI200 and MI100 series
------------------------------------------------------------------------------------------------------------------------

+--------------------------+--------------+----------------------+
| Product name             | Speed (GB/s) | Interconnect         |
+==========================+==============+======================+
| Broadcom N2100G          | 200          | RoCE v2              |
+--------------------------+--------------+----------------------+
| Broadcom N1200G          | 200          | RoCE v2              |
+--------------------------+--------------+----------------------+
| Broadcom P2100G          | 200          | RoCE v2              |
+--------------------------+--------------+----------------------+
| Broadcom P1200G          | 200          | RoCE v2              |
+--------------------------+--------------+----------------------+
| NVIDIA ConnectX-6 series | 200          | RoCE v2 / InfiniBand |
+--------------------------+--------------+----------------------+

When deploying ROCm, consult the :doc:`ROCm compatibility matrix <rocm:compatibility/compatibility-matrix>` to ensure
compatibility, and install the latest version appropriate for your operating system and driver support.

Refer to the `Broadcom Ethernet Network Adapter User Guide
<https://techdocs.broadcom.com/us/en/storage-and-ethernet-connectivity/ethernet-nic-controllers/bcm957xxx/adapters.html>`_
for installation, configuration, and tuning documentation for Broadcom devices.
