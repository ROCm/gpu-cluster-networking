.. meta::
   :description: Learn how to configure a single node for network testing.
   :keywords: network validation, DCGPU, single node, ROCm, RCCL, machine learning, LLM, usage, tutorial

***************************************************************
Single-node network configuration for AMD Instinct accelerators
***************************************************************

This section explains setting up a testing environment on a single accelerator node and running benchmarks to simulate an AI or HPC workload.

Prerequisites
=============

Before following the steps in the following sections, ensure you have completed
these prerequisites.

#. Install GPU and network hardware. Refer to the
   :ref:`hardware support matrix </reference/hardware-support>`.

#. Install OS and required GPU and network software on each node:

   * :doc:`Install the ROCm software stack <rocm-install-on-linux:index>`.

   * Install network drivers for NICs. If using InfiniBand, also install OpenSM.

#. Ensure network settings are correctly configured for your hardware.

#. Configure system BIOS and OS settings according to
   :doc:`rocm:how-to/system-optimization/index` for your architecture
   (MI300, MI200, and so on).

#. Disable NUMA balancing.

   a. Run ``sudo sysctl kernel.numa_balancing=0``.

   b. To verify NUMA balancing is disabled, run
      ``cat /proc/sys/kernel/numa_balancing`` and confirm that ``0`` is
      returned.

   c. See :ref:`rocm:mi300x-disable-numa` for more information.

#. Disable PCI ACS (access control services). Run the
   :ref:`disable ACS script<disable-acs-script>` on all PCIe devices supporting
   it. This must be done after each reboot.

#. Configure IOMMU settings.

   a. Add ``iommu=pt`` to the ``GRUB_CMDLINE_LINUX_DEFAULT`` entry in
      ``/etc/default/grub``.

   b. Run ``sudo update-grub``, then reboot.

   c. See :ref:`rocm:mi300x-grub-settings` and
      :ref:`rocm-install-on-linux:multi-gpu` for more information.

#. Verify group permissions.

   a. Ensure the user belongs to the ``render`` and ``video`` groups.

   b. Refer to :ref:`rocm-install-on-linux:group_permissions` for guidance.

Best practices for software consistency
---------------------------------------

To ensure consistent software configurations across systems:

* Use a shared NFS (network file system) mount. Install the necessary software
  on a common NFS mount accessible to all systems.

* Create a system image with all the software installed. Re-image when software
  changes are made.

Validate PCIe performance
=========================

Checking that your relevant PCIe devices (GPUs, NICs, and internal switches) are
using the maximum available transfer speed and width in their respective bus
keeps you from having to troubleshoot any related issues in subsequent testing
where it may not be obvious.

.. tip::

   Gather all the PCIe addresses for your GPUs, NICs, and switches in advance
   and take note of them so you have them on hand for next steps.

Check PCIe device speed and width
---------------------------------

#. From the command line of your host, run ``lspci`` to retrieve a list of PCIe
   devices and locate your GPU and network devices.

#. Run ``sudo lspci -s <PCI address> -vvv | grep Speed`` to review the speed and
   width of your device. This example shows the speed and width for a GPU at the
   address ``02:00.0``.

   .. tab-set::

      .. tab-item:: Shell output

         .. code-block:: shell

            $ sudo lspci -s 02:00.0 -vvv | grep Speed

            LnkCap: Port #0, Speed 32GT/s, Width x16, ASPM L0s L1, Exit Latency L0s <64ns, L1 <1us
            LnkSta: Speed 32GT/s (ok), Width x16 (ok)      

      .. tab-item:: Commands       

         ::                                   

            sudo lspci -s 02:00.0 -vvv | grep Speed

   The maximum supported speed of the GPU is reported in ``LnkCap`` along with
   a width of x16. Current status is shown in ``LnkSta``--both speed and width
   are aligned. Your values may differ depending on your hardware.

#. Query and validate all GPUs in your node with the previous steps.

#. Gather the PCI addresses for your NICs and validate them next. See this
   example from a NIC running at ``05:00.0``:

   .. tab-set::

      .. tab-item:: Shell output

         .. code-block:: shell

            $ sudo lspci -s 05:00.0 -vvv | grep Speed

            LnkCap: Port #0, Speed 16GT/s, Width x16, ASPM not supported
            LnkSta: Speed 16GT/s (ok), Width x16 (ok)      

      .. tab-item:: Commands

         ::

            sudo lspci -s 05:00.0 -vvv | grep Speed

   Here, the NIC is running at a speed of 16GT/s. However, because the NIC
   configuration only supports PCIe Gen4 speeds, this is an expected value.

Once you verify all GPUs and NICs are running at maximum supported speeds and
widths, then proceed to the next section.

.. note::

   If you're running a cloud instance, hardware passthrough to your guest OS
   might not be accurate. Verify your ``lspci`` results with your cloud
   provider.

Check PCIe switch speed and width
---------------------------------

Now, check the PCIe switches to ensure they are operating at the maximum speed
and width for the ``LnkSta`` (Link Status).

#. Run ``lspci -vv`` and ``lspci -tv`` to identify PCIe switch locations on the
   server.

#. Run ``lspci -vvv <PCI address> | grep Speed`` to verify speed and width as
   previously demonstrated.

Check max payload size and max read request
-------------------------------------------

The ``MaxPayload`` and ``MaxReadReq`` attributes define the maximum size of PCIe
packets and the number of simultaneous read requests, respectively. For optimal
bandwidth, ensure that all GPUs and NICs are configured to use the maximum
values for both attributes.

#. Run ``sudo lspci -vvv <PCI address> | grep DevCtl: -C 2`` to review max
   payload size and max read request. Here is an example using the same NIC as
   before.

   .. tab-set::

      .. tab-item:: Shell output

         .. code-block:: shell-session

            $ sudo lspci -vvv 05:00.0 | grep DevCtl: -C 2

            DevCap: MaxPayload 512 bytes, PhantFunc 0, Latency L0s <4us, L1 <64us
                     ExtTag+ AttnBtn- AttnInd- PwrInd- RBE+ FLReset+ SlotPowerLimit 40.000W
            DevCtl: CorrErr+ NonFatalErr+ FatalErr+ UnsupReq-
                     RlxdOrd+ ExtTag+ PhantFunc- AuxPwr+ NoSnoop+ FLReset-
                     MaxPayload 512 bytes, MaxReadReq 4096 bytes     

      .. tab-item:: Commands

         ::

            sudo lspci -vvv 05:00.0 | grep DevCtl: -C 2

#. ``MaxReadRequest`` is unique because it can be changed during runtime with
   the ``setpci`` command. If your value here is lower than expected, you can
   correct it as follows:

   .. tab-set::

      .. tab-item:: Shell output

         .. code-block:: shell

            $ sudo lspci -vvvs a1:00.0 | grep axReadReq

            MaxPayload 512 bytes, MaxReadReq 512 bytes

            $ sudo setpci -s a1:00.0 68.w

            295e

            $ sudo setpci -s a1:00.0 68.w=595e

            $ sudo lspci -vvvs a1:00.0 | grep axReadReq

            MaxPayload 512 bytes, MaxReadReq 4096 bytes

      .. tab-item:: Commands

         ::

            sudo lspci -vvvs a1:00.0 | grep axReadReq

            sudo setpci -s a1:00.0 68.w

            sudo setpci -s a1:00.0 68.w=595e

            sudo lspci -vvvs a1:00.0 | grep axReadReq

.. note::

   Changes made with ``setpci`` are not persistent across reboots. This example
   uses a single NIC for simplicity, but in practice you must run the change for
   each NIC in the node.

Validate NIC configuration
==========================

After you've verified optimal PCIe speeds for all devices, configure your NICs
according to best practices in the manufacturer or vendor documentation. This
might already include some of the pre-assessment steps outlined in this guide and
provide more hardware-specific tuning optimizations. 

Vendor-specific NIC tuning
--------------------------

Your NICs may require tuning if it has not already been done. Some steps differ
based on the type of NIC you're deploying (InfiniBand or RoCE).

* Ensure :ref:`ACS is disabled<disable-acs-script>`.

* For Mellanox NICs (InfiniBand or RoCE): Disable ATS, enable PCI Relaxed Ordering, increase max read requests, enable advanced PCI settings. 

  .. code-block:: shell

     sudo mst start

     sudo mst status

     sudo mlxconfig -d /dev/mst/mt4123_pciconf0 s ADVANCED_PCI_SETTINGS=1

     sudo mlxconfig -d /dev/mst/mt4123_pciconf0 s MAX_ACC_OUT_READ=44

     sudo mlxconfig -d /dev/mst/mt4123_pciconf0 s PCI_WR_ORDERING=1

     reboot

* For Broadcom NICs, ensure RoCE is enabled and consider disabling any unused
  ports. See the :ref:`Broadcom RoCE configuration scripts<RoCE-configuration-script-for-Broadcom-Thor-NIC>`
  for more details.

* Ensure Relaxed Ordering is enabled in the PCIe settings for your system BIOS as well.

.. note::

   All instructions for RoCE networks in this guide and additional guides are
   based on the v2 protocol.

Check NIC link speed
--------------------

Verify the NICs in your servers are reporting the correct speeds. Several commands and utilities are available to measure speed based on your network type.

* RoCE / Ethernet
   - ``sudo ethtool <interface> | grep -i speed``
   - ``cat /sys/class/net/<interface>/speed``

* InfiniBand
   - ``ibdiagnet`` provides an output of the entire fabric in the default log files. You can verify link speeds here.
   - ``ibstat`` or ``ibstatus`` tells you if the link is up and the speed at which it is running for all HCAs in the server.

Verify Mellanox OFED and firmware installation
----------------------------------------------

.. note::

   This step is only necessary for InfiniBand networks.

Download the latest version of
`Mellanox OFED (MLNX_OFED) <https://docs.nvidia.com/networking/display/mlnxofedv461000/downloading+mellanox+ofed>`_
from NVIDIA. Run the installer and flint tools to verify the latest version of
MLNX_OFED and firmware is on the HCAs.

Set up a GPU testing environment
================================

Next, create a testing environment to gather performance data for your GPUs.
This requires installation of ROCm Validation Suite (RVS), TransferBench, and
ROCm Bandwidth Test.

#. Connect to the CLI of your GPU node.

#. Install ROCm Validation Suite following the directions at
   :doc:`ROCmValidationSuite:install/installation`

   * Once installed, RVS is located in ``/opt/rocm/``.

#. Install TransferBench. Refer to :doc:`transferbench:install/install` for
   details.

   .. code-block:: shell

      $ git clone https://github.com/ROCm/TransferBench.git

      $ cd TransferBench

      $ sudo make

      # Running make without sudo seems to cause runtime issues
      # If this doesn't work, install math libraries manually using https://github.com/ROCm/ROCm/issues/1843

      $ sudo apt install libstdc++-12-dev

#. Install ROCm Bandwidth Test. Refer to :doc:`rocm_bandwidth_test:install/install`
   for details.

   .. code-block:: shell
      
      $ sudo apt install rocm-bandwidth-test

Run ROCm Validation Suite (RVS)
-------------------------------

RVS contains many different tests, otherwise referred to as modules. The relevant tests for this guide are as follows:

* `P2P Benchmark and Qualification Tool <https://rocm.docs.amd.com/projects/ROCmValidationSuite/en/latest/conceptual/rvs-modules.html#p2p-benchmark-and-qualification-tool-pbqt-module>`_ (PBQT)

* `ROCm Configuration Qualification Tool <https://rocm.docs.amd.com/projects/ROCmValidationSuite/en/latest/conceptual/rvs-modules.html#rocm-configuration-qualification-tool-rcqt-module>`_ (RCQT)

* `PCI Express Bandwidth Benchmark <https://rocm.docs.amd.com/projects/ROCmValidationSuite/en/latest/conceptual/rvs-modules.html#pci-express-bandwidth-benchmark-pebb-module>`_ (PEBB)

* `GPU Properties <https://rocm.docs.amd.com/projects/ROCmValidationSuite/en/latest/conceptual/rvs-modules.html#gpu-properties-gpup>`_ (GPUP)

* `GPU Stress test <https://rocm.docs.amd.com/projects/ROCmValidationSuite/en/latest/conceptual/rvs-modules.html#gpu-stress-test-gst-module>`_ (GST)

You can run multiple tests at once with ``sudo /opt/rocm/rvs/rvs -d 3``, which
runs all tests set in ``/opt/rocm/share/rocm-validation-suite/rvs.conf`` at
verbosity level 3. The default tests are GPUP, PEQT, PEBB, and PBQT, but you can
modify the config file to add your preferred tests. The
:doc:`RVS documentation <rocmvalidationsuite:how%20to/configure-rvs>` has more
information on how to modify ``rvs.conf`` and helpful command line options.  

.. tip::

   When you identify a problem, use ``rvs -g`` to understand what the GPU ID is
   referring to. 

   GPU numbering in RVS does not have the same order as in ``rocm-smi``. To map
   the GPU order listed in ``rvs-g`` to the rocm output, run
   ``rocm-smi --showbus`` and match each GPU by bus ID. 

You can run a specific RVS test by calling its configuration file with
``sudo /opt/rocm/bin/rvs -c /opt/rocm/share/rocm-validation-suite/conf/<test name>.conf``.
The following shell examples demonstrate what the commands and outputs look like
for some of these tests. 

Example of GPU stress tests with the GST module
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. tab-set::

   .. tab-item:: Shell output

      .. code-block:: shell-session

         $ sudo /opt/rocm/bin/rvs -c /opt/rocm/share/rocm-validation-suite/conf/gst_single.conf

         [RESULT] [508635.659800] Action name :gpustress-9000-sgemm-false
         [RESULT] [508635.660582] Module name :gst
         [RESULT] [508642.648770] [gpustress-9000-sgemm-false] gst <GPU ID> GFLOPS <performance output>
         [RESULT] [508643.652155] [gpustress-9000-sgemm-false] gst <GPU ID> GFLOPS <performance output>
         [RESULT] [508644.657965] [gpustress-9000-sgemm-false] gst <GPU ID> GFLOPS <performance output>
         [RESULT] [508646.633979] [gpustress-9000-sgemm-false] gst <GPU ID> GFLOPS <performance output>
         [RESULT] [508647.641379] [gpustress-9000-sgemm-false] gst <GPU ID> GFLOPS <performance output>
         [RESULT] [508648.649070] [gpustress-9000-sgemm-false] gst <GPU ID> GFLOPS <performance output>
         [RESULT] [508649.657010] [gpustress-9000-sgemm-false] gst <GPU ID> GFLOPS <performance output>
         [RESULT] [508650.665296] [gpustress-9000-sgemm-false] gst <GPU ID> GFLOPS <performance output>
         [RESULT] [508655.632843] [gpustress-9000-sgemm-false] gst <GPU ID> GFLOPS <performance output> Target stress : <stress value> met :TRUE

   .. tab-item:: Commands

      ::

         sudo /opt/rocm/bin/rvs -c /opt/rocm/share/rocm-validation-suite/conf/gst_single.conf                

Example of PCIe bandwidth benchmarks with the PBQT module
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. tab-set::

   .. tab-item:: Shell output

      .. code-block:: shell-session

         $ sudo /opt/rocm/rvs/rvs -c /opt/rocm/share/rocm-validation-suite/conf/pbqt_single.conf -d 3

         [RESULT] [1148200.536604] Action name :action_1

                     Discovered Nodes
         ==============================================

         Node Name                                                              Node Type               Index      GPU ID
         =============================================================================================================================
         <CPU1>                                                                    CPU                   0         N/A

         <CPU2>                                                                    CPU                   1         N/A

         <CPU3>                                                                    CPU                   2         N/A

         <CPU4>                                                                    CPU                   3         N/A

         <GPU1>                                                                    GPU                   4         <GPU1-ID>

         <GPU2>                                                                    GPU                   5         <GPU2-ID>
         =============================================================================================================================
         [RESULT] [1148200.576371] Module name :pbqt
         [INFO  ] [1148200.576394] Missing 'device_index' key.
         [RESULT] [1148200.576498] [action_1] p2p <GPU1> <GPU2> peers:true distance:72 PCIe:72
         [RESULT] [1148205.576740] [action_1] p2p-bandwidth  [1/1] <GPU1> <GPU2>  bidirectional: true  <result> GBps  duration: <result> sec
         [RESULT] [1148205.577850] Action name :action_2
         [RESULT] [1148205.577862] Module name :pbqt
         [INFO  ] [1148205.577883] Missing 'device_index' key.
         [RESULT] [1148205.578085] [action_2] p2p <GPU1> <GPU2> peers:true distance:72 PCIe:72
         [INFO  ] [1148216.581794] [action_2] p2p-bandwidth  [1/1] <GPU1> <GPU2>  bidirectional: true  <result> GBps
         [INFO  ] [1148217.581371] [action_2] p2p-bandwidth  [1/1] <GPU1> <GPU2>  bidirectional: true  <result> GBps
         [INFO  ] [1148218.580844] [action_2] p2p-bandwidth  [1/1] <GPU1> <GPU2>  bidirectional: true  <result> GBps
         [INFO  ] [1148219.580909] [action_2] p2p-bandwidth  [1/1] <GPU1> <GPU2>  bidirectional: true  <result> GBps

   .. tab-item:: Commands

      ::

         sudo /opt/rocm/rvs/rvs -c /opt/rocm/share/rocm-validation-suite/conf/pbqt_single.conf -d 3

Run TransferBench
-----------------

TransferBench is a benchmarking tool designed to measure simultaneous data
transfers between CPU and GPU devices. To use it, first navigate to the
TransferBench installation directory. Then, execute the following command to
display available commands, flags, and an overview of your system's CPU/GPU
topology as detected by TransferBench:

.. code-block:: shell

   ./TransferBench

Like RVS, TransferBench operates based on configuration files. You can either
choose from several preset configuration files or create a custom configuration
to suit your testing needs. A commonly recommended test is the ``p2p``
(peer-to-peer) test, which measures unidirectional and bidirectional transfer
rates across all CPUs and GPUs detected by the tool. The following example shows
the output of a ``p2p`` test on a system with 2 CPUs and 8 GPUs, using 4 MB
transfer packets.

.. tab-set::

   .. tab-item:: Shell output

      .. code-block:: shell-session

         $ ./TransferBench p2p 4M

         TransferBench v1.50
         ===============================================================
         [Common]                              
         ALWAYS_VALIDATE      =            0 : Validating after all iterations
         <SNIP>……
         Bytes Per Direction 4194304
         Unidirectional copy peak bandwidth GB/s [Local read / Remote write] (GPU-Executor: GFX)
            SRC+EXE\DST    CPU 00    CPU 01       GPU 00    GPU 01    GPU 02    GPU 03    GPU 04    GPU 05    GPU 06    GPU 07
            CPU 00  ->     24.37     25.62        17.32     16.97     17.33     17.47     16.77     17.12     16.91     16.96
            CPU 01  ->     18.83     19.62        14.84     15.47     15.16     15.13     16.11     16.13     16.01     15.91

            GPU 00  ->     23.83     23.40       108.95     64.58     31.56     28.39     28.44     26.99     47.46     39.97
            GPU 01  ->     24.05     23.93        66.52    109.18     29.07     32.53     27.80     31.73     40.79     36.42
            GPU 02  ->     23.83     23.47        31.48     28.58    109.45     65.11     47.40     40.11     28.45     27.46
            GPU 03  ->     24.35     23.93        28.65     32.00     65.68    108.68     39.85     36.08     27.08     31.49
            GPU 04  ->     23.30     23.84        28.57     26.93     47.36     39.77    110.94     64.66     31.14     28.15
            GPU 05  ->     23.39     24.08        27.19     31.26     39.85     35.49     64.98    110.10     28.57     31.43
            GPU 06  ->     23.43     24.03        47.58     39.22     28.97     26.93     31.48     28.41    109.78     64.98
            GPU 07  ->     23.45     23.94        39.70     35.50     27.08     31.25     28.14     32.19     65.00    110.47
                                       CPU->CPU  CPU->GPU  GPU->CPU  GPU->GPU
            Averages (During UniDir):     22.23     16.35     23.77     37.74

         Bidirectional copy peak bandwidth GB/s [Local read / Remote write] (GPU-Executor: GFX)
            SRC\DST    CPU 00    CPU 01       GPU 00    GPU 01    GPU 02    GPU 03    GPU 04    GPU 05    GPU 06    GPU 07
            CPU 00  ->       N/A     17.07        16.90     17.09     15.39     17.07     16.62     16.65     16.40     16.32
            CPU 00 <-        N/A     13.90        24.06     24.03     24.00     24.21     23.09     23.14     22.11     22.15
            CPU 00 <->       N/A     30.97        40.96     41.12     39.39     41.28     39.71     39.80     38.51     38.47

            CPU 01  ->     12.85       N/A        15.29     15.14     15.03     15.16     15.95     15.62     16.06     15.85
            CPU 01 <-      17.34       N/A        22.95     23.18     22.98     22.92     23.86     24.05     23.94     23.94
            CPU 01 <->     30.19       N/A        38.24     38.32     38.01     38.08     39.80     39.67     40.00     39.79


            GPU 00  ->     23.99     22.94          N/A     62.40     30.30     25.15     25.00     25.20     46.58     37.99
            GPU 00 <-      16.87     14.75          N/A     65.21     31.10     25.91     25.53     25.48     47.34     38.17
            GPU 00 <->     40.85     37.69          N/A    127.61     61.40     51.06     50.53     50.68     93.91     76.16

            GPU 01  ->     24.11     23.20        65.10       N/A     25.88     31.74     25.66     31.01     39.37     34.75
            GPU 01 <-      17.00     14.08        61.91       N/A     26.09     31.90     25.73     31.34     38.97     34.76
            GPU 01 <->     41.11     37.29       127.01       N/A     51.97     63.64     51.39     62.35     78.35     69.51

            GPU 02  ->     23.89     22.78        30.94     26.39       N/A     62.22     45.73     38.40     25.95     25.26
            GPU 02 <-      16.59     13.91        30.47     26.54       N/A     63.63     47.42     38.68     26.29     25.64
            GPU 02 <->     40.48     36.69        61.42     52.93       N/A    125.85     93.15     77.08     52.24     50.90

            GPU 03  ->     24.15     22.98        25.84     31.69     64.03       N/A     38.82     35.12     25.46     30.82
            GPU 03 <-      17.22     14.19        25.28     31.16     61.90       N/A     38.16     34.85     25.81     30.97
            GPU 03 <->     41.37     37.16        51.12     62.84    125.93       N/A     76.99     69.97     51.27     61.79

            GPU 04  ->     23.12     23.73        25.50     25.40     47.04     38.29       N/A     62.44     30.56     25.15
            GPU 04 <-      16.15     12.86        25.13     25.63     46.38     38.65       N/A     63.89     30.88     25.74
            GPU 04 <->     39.27     36.58        50.63     51.03     93.42     76.94       N/A    126.34     61.43     50.89

            GPU 05  ->     23.09     24.04        25.61     31.29     38.82     34.96     63.55       N/A     25.87     30.35
            GPU 05 <-      13.65     15.46        25.26     30.87     38.51     34.70     61.57       N/A     26.34     31.47
            GPU 05 <->     36.75     39.50        50.87     62.16     77.32     69.66    125.12       N/A     52.21     61.82

            GPU 06  ->     22.09     23.73        47.51     38.56     26.15     25.59     31.32     25.98       N/A     62.34
            GPU 06 <-      16.31     15.40        46.22     39.16     25.63     25.17     30.44     25.58       N/A     63.88
            GPU 06 <->     38.39     39.13        93.72     77.72     51.78     50.76     61.76     51.56       N/A    126.22

            GPU 07  ->     22.31     23.88        38.68     34.96     25.54     30.96     25.79     31.28     63.69       N/A
            GPU 07 <-      16.27     15.89        38.39     35.06     25.27     30.62     25.25     30.91     62.36       N/A
            GPU 07 <->     38.58     39.77        77.07     70.02     50.81     61.58     51.05     62.20    126.04       N/A
                                       CPU->CPU  CPU->GPU  GPU->CPU  GPU->GPU
         Averages (During  BiDir):     15.29     19.72     19.39     36.17

   .. tab-item:: Commands

      ::

         ./TransferBench p2p 4M

If you want to define your own configuration file, run
``cat ~/TransferBench/examples/example.cfg`` to view an example configuration
file with information on commands and arguments to run more granular testing.
Running DMA tests between single pairs of devices is one helpful and common
use case for custom configuration files. See the
`TransferBench documentation <transferbench:index>` for more information.

Run ROCm Bandwidth Test (RBT)
-----------------------------

ROCm Bandwidth Test lets you identify performance characteristics for
host-to-device (H2D), device-to-host (D2H), and device-to-device (D2D) buffer
copies on a ROCm platform. This assists when looking for abnormalities and
tuning performance.

Run ``/opt/rocm/bin/rocm-bandwidth-test -h`` to get a help screen with available
commands.

.. code-block:: shell-session

   $ /opt/rocm/bin/rocm-bandwidth-test -h

   Supported arguments:

            -h    Prints the help screen
            -q    Query version of the test
            -v    Run the test in validation mode
            -l    Run test to collect Latency data
            -c    Time the operation using CPU Timers
            -e    Prints the list of ROCm devices enabled on platform
            -i    Initialize copy buffer with specified 'long double' pattern
            -t    Prints system topology and allocatable memory info
            -m    List of buffer sizes to use, specified in Megabytes
            -b    List devices to use in bidirectional copy operations
            -s    List of source devices to use in copy unidirectional operations
            -d    List of destination devices to use in unidirectional copy operations
            -a    Perform Unidirectional Copy involving all device combinations
            -A    Perform Bidirectional Copy involving all device combinations

            NOTE: Mixing following options is illegal/unsupported
                  Case 1: rocm_bandwidth_test -a with {lm}{1,}
                  Case 2: rocm_bandwidth_test -b with {clv}{1,}
                  Case 3: rocm_bandwidth_test -A with {clmv}{1,}
                  Case 4: rocm_bandwidth_test -s x -d y with {lmv}{2,}

The default behavior of ``/opt/rocm/bin/rocm-bandwidth-test`` without any flags
runs unilateral and bilateral benchmarks (flags ``-a`` and ``-A``) on all
available combinations of device. Review the following for examples of common
commands and output.

Getting a list of all ROCm-detected devices:

.. tab-set::

   .. tab-item:: Shell output

      .. code-block:: shell-session

         $ /opt/rocm/bin/rocm-bandwidth-test -e

         RocmBandwidthTest Version: 2.6.0

            Launch Command is: /opt/rocm/bin/rocm-bandwidth-test -e


            Device Index:                             0
            Device Type:                            CPU
            Device Name:                            <CPU Name>
               Allocatable Memory Size (KB):         1044325060

            Device Index:                             1
            Device Type:                            CPU
            Device Name:                            <CPU Name>
               Allocatable Memory Size (KB):         1056868156

            Device Index:                             2
            Device Type:                            GPU
            Device Name:                            <GPU Name>
            Device  BDF:                            XX:0.0
            Device UUID:                            GPU-0000
               Allocatable Memory Size (KB):         67092480
               Allocatable Memory Size (KB):         67092480

            Device Index:                             3
            Device Type:                            GPU
            Device Name:                            <GPU Name>
            Device  BDF:                            XX:0.0
            Device UUID:                            GPU-0000
               Allocatable Memory Size (KB):         67092480
               Allocatable Memory Size (KB):         67092480

            Device Index:                             4
            Device Type:                            GPU
            Device Name:                            <GPU Name>
            Device  BDF:                            XX:0.0
            Device UUID:                            GPU-0000
               Allocatable Memory Size (KB):         67092480
               Allocatable Memory Size (KB):         67092480

            Device Index:                             5
            Device Type:                            GPU
            Device Name:                            <GPU Name>
            Device  BDF:                            XX:0.0
            Device UUID:                            GPU-0000
               Allocatable Memory Size (KB):         67092480
               Allocatable Memory Size (KB):         67092480

            Device Index:                             6
            Device Type:                            GPU
            Device Name:                            <GPU Name>
            Device  BDF:                            XX:0.0
            Device UUID:                            GPU-0000
               Allocatable Memory Size (KB):         67092480
               Allocatable Memory Size (KB):         67092480

            Device Index:                             7
            Device Type:                            GPU
            Device Name:                            <GPU Name>
            Device  BDF:                            XX:0.0
            Device UUID:                            GPU-0000
               Allocatable Memory Size (KB):         67092480
               Allocatable Memory Size (KB):         67092480

            Device Index:                             8
            Device Type:                            GPU
            Device Name:                            <GPU Name>
            Device  BDF:                            XX:0.0
            Device UUID:                            GPU-0000
               Allocatable Memory Size (KB):         67092480
               Allocatable Memory Size (KB):         67092480

            Device Index:                             9
            Device Type:                            GPU
            Device Name:                            <GPU Name>
            Device  BDF:                            XX:0.0
            Device UUID:                            GPU-0000
               Allocatable Memory Size (KB):         67092480
               Allocatable Memory Size (KB):         67092480

   .. tab-item:: Commands

      ::

         /opt/rocm/bin/rocm-bandwidth-test -e

Running a unidirectional benchmark between devices 0 (CPU) and 4 (GPU):

.. tab-set::

   .. tab-item:: Shell output

      .. code-block:: shell

         $ /opt/rocm/bin/rocm-bandwidth-test -s 0 -d 4
         ........................................
                  RocmBandwidthTest Version: 2.6.0

                  Launch Command is: /opt/rocm/bin/rocm-bandwidth-test -s 0 -d 4


         ================    Unidirectional Benchmark Result    ================
         ================ Src Device Id: 0 Src Device Type: Cpu ================
         ================ Dst Device Id: 4 Dst Device Type: Gpu ================

         Data Size      Avg Time(us)   Avg BW(GB/s)   Min Time(us)   Peak BW(GB/s)
         1 KB           5.400          0.190          5.280          0.194
         2 KB           5.360          0.382          5.280          0.388
         4 KB           5.440          0.753          5.440          0.753
         8 KB           5.440          1.506          5.440          1.506
         16 KB          5.880          2.786          5.760          2.844
         32 KB          6.400          5.120          6.400          5.120
         64 KB          7.520          8.715          7.520          8.715
         128 KB         9.920          13.213         9.920          13.213
         256 KB         14.520         18.054         14.400         18.204
         512 KB         23.560         22.253         23.520         22.291
         1 MB           41.880         25.038         41.760         25.110
         2 MB           78.400         26.749         78.400         26.749
         4 MB           153.201        27.378         152.641        27.478
         8 MB           299.641        27.996         299.521        28.007
         16 MB          592.002        28.340         592.002        28.340
         32 MB          1176.925       28.510         1176.805       28.513
         64 MB          2346.730       28.597         2346.730       28.597
         128 MB         4686.180       28.641         4686.100       28.642
         256 MB         9365.280       28.663         9365.160       28.663
         512 MB         18722.762      28.675         18722.482      28.675

   .. tab-item:: Commands

      ::

         /opt/rocm/bin/rocm-bandwidth-test -s 0 -d 4

Running a bidirectional benchmark on all available device combinations:

.. tab-set::

   .. tab-item:: Shell output

      .. code-block:: shell

         $ /opt/rocm/bin/rocm-bandwidth-test -A

         <SNIP>……   
         Bidirectional copy peak bandwidth GB/s

               D/D       0           1           2           3           4           5           6           7           8           9

               0         N/A         N/A         47.703      47.679      47.619      47.586      38.106      38.160      36.771      36.773

               1         N/A         N/A         38.351      38.395      36.488      36.454      47.495      47.512      47.525      47.471

               2         47.703      38.351      N/A         101.458     80.902      81.300      81.387      79.279      101.526     101.106

               3         47.679      38.395      101.458     N/A         81.278      80.488      79.535      79.907      101.615     101.618

               4         47.619      36.488      80.902      81.278      N/A         101.643     101.089     101.693     81.336      79.232

               5         47.586      36.454      81.300      80.488      101.643     N/A         101.217     101.478     79.460      79.922

               6         38.106      47.495      81.387      79.535      101.089     101.217     N/A         101.506     80.497      81.302

               7         38.160      47.512      79.279      79.907      101.693     101.478     101.506     N/A         81.301      80.501

               8         36.771      47.525      101.526     101.615     81.336      79.460      80.497      81.301      N/A         100.908

               9         36.773      47.471      101.106     101.618     79.232      79.922      81.302      80.501      100.908     N/A

   .. tab-item:: Commands

      ::

         /opt/rocm/bin/rocm-bandwidth-test -A

For a more detailed explanation of different ways to run ROCm Bandwidth Test,
see the
`ROCm Bandwidth Test user guide <https://github.com/ROCm/rocm_bandwidth_test/blob/master/ROCmBandwithTest_UserGuide.pdf>`_.

Configuration scripts
=====================

Run these scripts where indicated to aid in the configuration and setup of your devices.

.. _disable-acs-script:

.. dropdown:: Disable ACS script

   .. code-block:: shell

      #!/bin/bash
      #
      # Disable ACS on every device that supports it
      #
      PLATFORM=$(dmidecode --string system-product-name)
      logger "PLATFORM=${PLATFORM}"
      # Enforce platform check here.
      #case "${PLATFORM}" in
               #"OAM"*)
                     #logger "INFO: Disabling ACS is no longer necessary for ${PLATFORM}"
                     #exit 0
                     #;;
               #*)
                     #;;
      #esac
      # must be root to access extended PCI config space
      if [ "$EUID" -ne 0 ]; then
               echo "ERROR: $0 must be run as root"
               exit 1
      fi
      for BDF in `lspci -d "*:*:*" | awk '{print $1}'`; do
               # skip if it doesn't support ACS
               setpci -v -s ${BDF} ECAP_ACS+0x6.w > /dev/null 2>&1
               if [ $? -ne 0 ]; then
                     #echo "${BDF} does not support ACS, skipping"
                     continue
               fi
               logger "Disabling ACS on `lspci -s ${BDF}`"
               setpci -v -s ${BDF} ECAP_ACS+0x6.w=0000
               if [ $? -ne 0 ]; then
                     logger "Error enabling directTrans ACS on ${BDF}"
                     continue
               fi
               NEW_VAL=`setpci -v -s ${BDF} ECAP_ACS+0x6.w | awk '{print $NF}'`
               if [ "${NEW_VAL}" != "0000" ]; then
                     logger "Failed to enabling directTrans ACS on ${BDF}"
                     continue
               fi
      done
      exit 0

.. _RoCE-configuration-script-for-Broadcom-Thor-NIC:

.. dropdown:: RoCE configuration script for Broadcom Thor NIC

   .. code-block:: shell

      # Increase Max Read request Size to 4k 
      lspci -vvvs 41:00.0 | grep axReadReq

      # Check if Relaxed Ordering is enabled

      for i in $(sudo niccli listdev | grep Interface | awk {'print $5'}); \ do echo $i - $(sudo niccli -dev=$i getoption -name pcie_relaxed_ordering); done

      # Set Relaxed Ordering if not enabled 

      for i in $(sudo niccli listdev | grep Interface | awk {'print $5'}); \ do echo $i - $(sudo niccli -dev=$i setoption -name pcie_relaxed_ordering -value 1); done

      # Check if RDMA support is enabled

      for i in $(sudo niccli listdev | grep Interface | awk {'print $5'}); \ do echo $i - $(sudo niccli -dev=$i getoption -name support_rdma -scope 0) - $(sudo niccli -dev=$i \ getoption=support_rdma:1); done

      # Set RMDA support if not enabled 

      for i in $(sudo niccli listdev | grep Interface | awk {'print $5'}); \ do echo $i - $(sudo \ niccli -dev=$i setoption -name support_rdma -scope 0 -value 1) - $(sudo niccli -dev=$i \ setoption -name support_rdma -scope 1 -value 1); done

      # Set Speed Mask

      niccli -dev=<interface name> setoption=autodetect_speed_exclude_mask:0#01C0

      # Set 200Gbps

      ethtool -s <interface name> autoneg off speed 200000 duplex full

      # Set performance profile to RoCE ==REQUIRES REBOOT IF OLDER FIRMWARE LOADED==

      for i in $(sudo niccli listdev | grep Interface | awk {'print $5'}); \ do echo $i - $(sudo \ niccli -dev=$i setoption -name performance_profile -value 1); done

