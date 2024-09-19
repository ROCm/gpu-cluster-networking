************************
Hardware Support Matrix
************************

The processes detailed in these guides are validated to run on the following hardware in tandem with AMD Instinct GPUs:

Network Cards for AMD MI300X
============================

+--------------------------+---------+---------------------+
| Product Name             | Speed   | Interconnect        |
+==========================+=========+=====================+
| Broadcom P2200G          | 400Gb/s | RoCEv2              |
+--------------------------+---------+---------------------+
| Broadcom P1400GD         | 400Gb/s | RoCEv2              |
+--------------------------+---------+---------------------+
| Broadcom N1400GD         | 400Gb/s | RoCEv2              |
+--------------------------+---------+---------------------+
| Broadcom N2200G          | 400Gb/s | RoCEv2              |
+--------------------------+---------+---------------------+
| Nvidia ConnectX-7 series | 400Gb/s | RoCEv2 / InfiniBand |
+--------------------------+---------+---------------------+

Network Cards for AMD MI100X and MI200X
=======================================

+--------------------------+---------+---------------------+
| Product Name             | Speed   | Interconnect        |
+==========================+=========+=====================+
| Broadcom N2100G          | 200Gb/s | RoCEv2              |
+--------------------------+---------+---------------------+
| Broadcom N1200G          | 200Gb/s | RoCEv2              |
+--------------------------+---------+---------------------+
| Broadcom P2100G          | 200Gb/s | RoCEv2              |
+--------------------------+---------+---------------------+
| Broadcom P1200G          | 200Gb/s | RoCEv2              |
+--------------------------+---------+---------------------+
| Nvidia ConnectX-6 series | 200Gb/s | RoCEv2 / InfiniBand |
+--------------------------+---------+---------------------+


When deploying ROCm, refer to the `ROCm Compatibility Matrix <https://rocm.docs.amd.com/en/latest/compatibility/compatibility-matrix.html>`_ and install the latest version with regard to OS and driver support.