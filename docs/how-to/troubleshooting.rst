************************************************************************************************************************
Troubleshooting for common GPU cluster networking issues 
************************************************************************************************************************

Despite best efforts, you may run into situations where a cluster is not performing as expected after following the
configuration steps outlined in the other guides. Diagnosing these problems can be challenging due to the nature of the
data flow in cluster communications. There are many hardware components in the data path where a failure may hay
occurred, including but not limited to storage, host memory, host CPU, PCI switches, GPU, network cards, transceivers,
network cables, network switches, and more. Many of these hardware components have dedicated firmware or software to
control or use them. 

The combination of hardware, firmware, and software makes it difficult to isolate some issues. Therefore, the aim of
this guide is not to provide an exhaustive list of all the issues a GPU cluster might run into, but provide the
you with a general guidance and intuition on where to look if you detect a certain functional or performance issue. 

RCCL Errors
========================================================================================================================

Performance runs with `rccl-tests <https://github.com/ROCm/rccl-tests>`_ have multiple points of failure due to their
interaction with different software components (RDMA libraries and drivers, UCX, MPI, ROCm, and so on). Since several of
these components are open-source, error messages often are not RCCL-specific and may be challenging to decipher in the
context of a failed run. The table in this section provides a list of common errors and guidance on how to resolve
them.

Should you encounter an error that's not covered in this section, run the RDMA perftest ``ib_write_bw`` benchmark to get
at the root of the issue. 


.. list-table:: 
  :header-rows: 1
  :class: rccl-errors

  * - Error / Behavior
    - Solution
  * - System hangs after initiating RCCL run
    - There are multiple reasons RCCL could hang, including resource limit issues (ulimit), MPI attempting to initialize
      or run across non-viable interfaces (loopback, docker, virtual machine), or network connectivity. In the case of
      network issues, the system may hang before the software stack can report anything. 
      
      - Check and properly set :ref:`resource limits <resource-limits>`.
      - Use :ref:`mca parameters <mca-exclude-interfaces>` to exclude undesired MPI interfaces.
        ::

          mpirun ... -mca -oob_tcp_if_exclude=docker,lo -mca btl_tcp_if_exclude=docker,lo ...
      - :ref:`Disable firewall <disable-firewall>`, if enabled.
      - Check and resolve any :ref:`connectivity issues <network-connect-issues>`. Check RDMA ping, routing for RoCE, subnet manager working for IB setup.
      - Verify the interface name passed to :ref:`NCCL_SOCKET_IFNAME <RCCL-bootstrap-mismatch>` exists on all the servers. 
      - Check if :ref:`ACS is disabled <ACS-disabled-baremetal>` with ``sudo lspci -vvv | grep -i "acsctl"``. If you see ``SrcValid+`` among any of the ouputs, then ACS isn't disabled. Run the `disable ACS script <https://github.com/ROCm/cluster-networking/blob/main/general_scripts/dis_acs.sh>`_ as sudo/root to resolve.
  * - Low performance
    - Multiple possible causes, check the following:
     
      - On baremetal, :ref:`amdgpu driver is not loaded <amd-gpu-drivers-not-loaded>`. For virtualized environments, ACS can be enabled, but make sure ATS is as well.
      - Check :ref:`PCIe link status <PCie-device-speed-width>` on all the devices in the CPU-to-NIC packet datapath. This includes host bridges, PCI bridges, NICs, and GPUs.
      - Check the :ref:`system BIOS settings for MI300X <BIOS-misconfiguration>`. ``XGMI force link width`` should be set to 2. Memory interleaving should be set to ``Auto``.
      - Do a GPU subsystem health check using AMD-provided tools like AFHGC.
      - Update to a Linux kernel that has symbol ``ib_register_peer_memory_client`` or install ``ib_peer_mem`` for Broadcom NICs.
      - Use vendor PCI switch tools to ensure that P2P is enabled in the firmware. Otherwise, reach out to the server OEM to rebuild the PCIe switch firmware with P2P support.
      - Use :ref:`NCCL_IB_HCA <frontend-nic-RCCL-traffic>` to specify the interface RCCL should run on.
  * - UCX errors
    - Challenges with UCX often root source at network connectivity problems or RCCL failing to locate the bootstrap
      interface on a node.
      
      - :ref:`Disable firewall <disable-firewall>` if enabled.
      - Check and resolve any :ref:`connectivity issues <network-connect-issues>`. Check RDMA ping, routing for RoCE, subnet manager working for IB setup.
      - Verify the interface name passed to :ref:`NCCL_SOCKET_IFNAME <RCCL-bootstrap-mismatch>` exists on all the servers.
  * - NCCL WARN NUMA auto balancing enabled which can lead to variability in the RCCL performance!
    - Disable NUMA balancing. 
      ::       
      
        sudo sh -c 'echo 0 > /proc/sys/kernel/numa_balancing'
        # Confirm the value for /proc/sys/kernel/numa_balancing is 0
        cat /proc/sys/kernel/numa_balancing 
  * - No ROCm-capable device is detected
    - Occurs when ROCm and amdgpu are installed but the :ref:`amdgpu driver is not loaded <amd-gpu-drivers-not-loaded>`,
      or the current user/login name has not been added to the video and render groups. 
      
      - Run ``sudo modprobe amdgpu``
      - Run ``sudo usermod -a -G video,render $LOGNAME``, exit the shell, and log in again. Some systems may require a
        reboot after running these commands. 
  * - librccl.so: cannot open shared object file
    - :ref:`LD_LIBRARY_PATH <ld-library-misconfiguration>` does not contain the RCCL directory.
     
      - If using the default RCCL that installs with ROCm, specify the ROCm library path:
        ::

          mprirun ... -x LD_LIBRARY_PATH=<path_to_rocm>/rocm-x.y.z/lib:$LD_LIBRARY_PATH ...
      - If using manually compiled RCCL, provide the path to that RCCL version's library directory:
        ::

          mpirun ... -x LD_LIBRARY_PATH=<path_to_rccl_src>/rccl-x.y.z/lib:$LD_LIBRARY_PATH ...
      - To prevent other library-related errors, you can add Open MPI and UCX library directories to the
        LD_LIBRARY_PATH:
        ::

          mpirun ... -x LD_LIBRARY_PATH=<path_to_ompi>/ompi/lib:<path_to_rocm>/rocm-x.y.z/lib:<path_to_ucx>/ucx-x.y.z/lib:$LD_LIBRARY_PATH ..  
  * - When using NCCL_DEBUG=INFO as a parameter: 
      ::
        
        error: invalid usage (run with NCCL_DEBUG=WARN for details)
      
      When using NCCL_DEBUG=WARN as a parameter:
      ::
        
        error: NCCL WARN Bootstrap : no socket interface found 
    - Either :ref:`NCCL_SOCKET_IFNAME <RCCL-bootstrap-mismatch>` was not specified in the command and RCCL defaulted to
      an interface name that is not present on all servers, or the specified interface name does not exist on all the
      servers.      
      
      - Check across the cluster and run RCCL with NCCL_SOCKET_IFNAME=<iface_name>, where <iface_name> is an interface that exists on all the nodes.
  * - NCCL WARN hipIpcGetMemHandle failed : invalid argument
      
      NCCL WARN Missing "iommu=pt"
    - Check the status of IOMMU passthrough in ``/proc/cmdline``, should contain the string ``amd_iommu=on iommu=pt`` or ``intel_iommu=on iommu=pt``.  

RDMA Perftest errors
========================================================================================================================

.. list-table:: 
  :header-rows: 1
  :class: rdma-errors

  * - Error / Behavior
    - Solution
  * - Couldn't connect to <server_ip>:<port>
    - Causes include the network port already being in use and general connectivity problems.
      
      - Kill any perftest ``ib_write|read|send*`` processes that may be running.
      - :ref:`Disable firewall <disable-firewall>`, if enabled.
      - Check and resolve any :ref:`connectivity issues <network-connect-issues>`. Check RDMA ping, routing for RoCE, subnet manager working for IB setup.
  * - Failed to create QP
    - Occurs due to resource limits (ulimit), no RoCE/InfiniBand driver loaded, or no route to peer.
      
      - Check and properly set :ref:`resource limits <resource-limits>`.
      - If you're using ROCm memory, verify you enabled it during compilation.
      - Verify RoCE/InfiniBand driver is loaded.
      - :ref:`Disable firewall <disable-firewall>`, if enabled.
      - Ensure all :Ref:`links are online <check-link-status>`.
      - Check and resolve any :ref:`connectivity issues <network-connect-issues>`. Check RDMA ping, routing for RoCE, subnet manager working for IB setup.
  * - Unsupported memory type 
    - Occurs when perftest is compiled without ROCm support. Review and recompile RDMA perftest using :ref:`Multi-node Networking Guide instructions <OFED-Perftest-installation-and-benchmarking>`.
  * - libibverbs: Warning: Driver <version> does not support the kernel ABI
    - The :ref:`inbox Linux libraries <Linux-RDMA-driver-conflict>` are conflicting with the proprietary vendor (Broadcom, Nvidia) RDMA drivers.
      
      - Reinstall the RDMA drivers according to vendor instructions. 
  * - “Completion with error <x>” on message sizes greater than 1024 bytes
    - Occurs when :ref:`MTU is set to 1500 bytes <low-mtu-1500>` on the host and/or switch side.
    
      - Set an MTU of 9000 on the host. This supports both RDMA jumbo frames (4096) and TCP/IP jumbo frames (9000).
      - Set MTU to the maximum allowed value on the switch. This is usually a value slightly above 9000 for most modern
        switches. You may need to consult vendor documentation for the specific value.
  * - Couldn't initialize ROCm device
    - Occurs when ROCm and amdgpu are installed but the :ref:`amdgpu driver is not loaded <amd-gpu-drivers-not-loaded>`, or the current user/login name has
      not been added to the video and render groups. 
      
      - Run ``sudo modprobe amdgpu``
      - Run ``sudo usermod -a -G video,render $LOGNAME``, exit the shell, and log in again. Some systems may require a
        reboot after running these commands. 
  * - Host memory RDMA low performance 
    - Investigate PCIe links for :ref:`downgraded speed/width <PCie-device-speed-width>` or :ref:`BIOS misconfiguration <BIOS-misconfiguration>`-particularly XGMI width and memory interleaving.
      
      - Check the :ref:`system BIOS settings for MI300X <BIOS-misconfiguration>`. ``XGMI force link width`` should be set to 2. Memory interleaving should be set to ``Auto``.
  * - GPU RDMA low performance
    - Multiple possible causes, check the following.
      
      - On baremetal, :ref:`disable ACS <ACS-disabled-baremetal>`. For virtualized environments, ACS can be enabled, but make sure ATS is as well.
      - Check :ref:`PCIe link status <PCie-device-speed-width>` on all the devices in the CPU-to-NIC packet datapath. This includes host bridges, PCI bridges, NICs, and GPUs.
      - Check the :ref:`system BIOS settings for MI300X <BIOS-misconfiguration>`. ``XGMI force link width`` should be set to 2. Memory interleaving should be set to ``Auto``.
      - Do a GPU subsystem health check using AMD-provided tools like AFHGC.
      - Update to a Linux kernel that has symbol ``ib_register_peer_memory_client`` or install ``ib_peer_mem`` for Broadcom NICs.
      - Use vendor PCI switch tools to ensure that P2P is enabled in the firmware. Otherwise, reach out to the server OEM to rebuild the PCI switch firmware with P2P support.
  * - RDMA bandwidth varies across runs with performance drops on some message sizes
    - Indicates :ref:`kernel NUMA balancing <disable-kernel-numa-balancing>` is enabled.
      
      - Temporarily disable numa_balancing with ``sudo sh -c 'echo 0 > /proc/sys/kernel/numa_balancing``
      - Permanently disable numa_balancing by editing ``/etc/default/grub`` and adding string ``numa_balancing=0`` to ``GRUB_CMDLINE_LINUX_DEFAULT``. Remember to run ``sudo update-grub; sudo reboot``.

Causes and resolution for common network failures
========================================================================================================================

.. _network-connect-issues:

Network connectivity issues
------------------------------------------------------------------------------------------------------------------------

When your error reports a network issue and indicates no other hardware or software component, run the RDMA ping utility
``rping`` to ensure there are no RDMA connectivity issues. Note that some HPC libraries or versions will hang and
fail to report a specific error. You should also run ``rping`` in those scenarios to rule out connectivity issues. 

.. dropdown:: Example commands to run RDMA ping between all backend network paths on 2 servers

  .. code-block:: shell

    # Sample scripts to run RDMA ping on all the possible 64 network paths between 2 servers, 
    # each with 8 NICs connected over a switch or multiple switches. 
    # 
    # rping format
    # on host1: rping -s -a <host1_nic_ip_addr> -v -C <number_of_pings>
    # on host2: rping -c -a <host1_nic_ip_addr> -I <host2_nic_ip_addr> -v -C <number_of_pings>
    
    # host 1 script
    # =======================================================
    host1_nics="192.168.0.1 192.168.1.1 192.168.2.1 192.168.3.1 192.168.4.1 192.168.5.1 192.168.6.1 192.168.7.1"
    host2_nics="192.168.0.2 192.168.1.2 192.168.2.2 192.168.3.2 192.168.4.2 192.168.5.2 192.168.6.2 192.168.7.2"
    for server in ${host1_nics}; do 
        for client in ${host2_nics}; do
            echo "rping: server: ${server}. Expected client: ${client}"
            rping -s -a ${server} -v -C 4
        done
    done
    
    # host2 script (runs after host1 script)
    # ========================================================
    host1_nics="192.168.0.1 192.168.1.1 192.168.2.1 192.168.3.1 192.168.4.1 192.168.5.1 192.168.6.1 192.168.7.1"
    host2_nics="192.168.0.2 192.168.1.2 192.168.2.2 192.168.3.2 192.168.4.2 192.168.5.2 192.168.6.2 192.168.7.2"
    for server in ${host1_nics}; do # each NIC on host1 has a pending rping server process
        for client in ${host2_nics}; do # Each NIC on host2 spins a client to respond to the rping server on host1
            rping -c -a ${server} -I ${client} -v -C 4
        done
    done

If RDMA ping uncovers a network connectivity issue, then the next step is to look into NICs that are down, RDMA
configuration issues, routing misconfiguration, cabling issues or even bad switch ports. 

.. _disable-firewall:

Firewall enabled
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

When the firewall is enabled, distributed MPI/RCCL jobs hang because the firewall blocks incoming traffic
used for MPI initialization and rank discovery. Even if MPI initialization were successful, the job might still
fail when the firewall blocks RCCL collectives from receiving incoming data through the backend interfaces. 

You can observe by attempting to run an MPI/RCCL job with the firewall active. Even a simple mpi job like ``mpirun -np2
--hostfile hosts <hostname>`` is likely to hang.

To resolve, disable the firewall with the following commands:

* Ubuntu: ``sudo ufw disable``
* RHEL: ``sudo systemctl disable firewalld --now`` 

.. _check-link-status:

Link status
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Due to environmental factors such as temperature, network cable quality, and hardware degradation, links may either go
down or alternate between down and up states (flapping). Commands you can use to discover link issues include ``ip link
show``, ``rdma link show``, and ``ibstat``. 

Links may also go down due to driver and firmware issues. For those cases, run ``dmesg`` to see if the driver logged any
errors.

ARP flux and routing misconfiguration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

For servers with multiple NICs, having NICs in the same subnet often leads to ARP flux issues, where one interface
responds to an ARP request dedicated to another interface on the same host. If the interface that responds doesn't have an
RDMA stack (such as a frontend storage NIC), jobs and applications will fail due to RDMA packets getting dropped.

Even if the NIC that responds can process RDMA traffic, there is a risk of the router associating multiple IP addresses
to the same NIC and causing a traffic bottleneck while other NICs are idle. 

You can observe this behavior by running the RDMA ``ib_write_bw`` performance test and getting an error on completion.
Low bandwidth on RCCL tests are also a potential indicator.

Methods to resolve ARP flux include the following:

* Isolate NICs by placing them in different subnets (example: 192.168.2.1/24, 192.168.3.1/24, and so on).
* Isolate NICs by using point-to-point routing with the /31 netmask.
* Configuring ``arp_ignore`` and ``arp_announce`` sysctl settings. 

You can review a more detailed explanation for each of these methods in the section on :ref:`preventing ARP flux
<arp-flux-prevention>` from the RoCE cluster network configuration guide.

.. _resource-limits:

Resource limit restrictions
------------------------------------------------------------------------------------------------------------------------

RCCL and other HPC applications often open numerous files and demand significant pinned memory for each process. In
certain scenarios, the default limits the operating system places on open file descriptors (nofile) or memory locked by a process
(memlock) may be insufficient for RCCL's requirements. 

Signs that process limit resources are too small include:

* ``ib_write_bw`` runs may return an error: ``failed to create QP``.
* RCCL tests hang. 
* RCCL experiences segmentation errors.
* ``hipMalloc`` fails.

You can resolve this by editing ``/etc/security/limits.conf`` and appending the following lines:

.. code-block:: shell

  * soft memlock unlimited
  * hard memlock unlimited
  * soft nofile 1048576
  * hard nofile 1048576
  
Once saved, log out of the Linux shell and log back in.

.. _Linux-RDMA-driver-conflict:

Conflicting NIC vendor and Linux inbox RDMA packages
------------------------------------------------------------------------------------------------------------------------

Sometimes a system may have had NIC drivers correctly installed according to vendor instructions (Broadcom, Nvidia), but
Linux inbox drivers or libraries were introduced with later packages. This can cause conflicting drivers or libraries
that interfere with the normal operation of RDMA applications.

RDMA drive conflicts can be identified by the error ``libibverbs: Warning: Driver <x.y.z> does not support the kernel ABI``.

To resolve, reinstall the RoCE drivers according to the vendor instructions.

.. _low-mtu-1500:

Low MTU setting
------------------------------------------------------------------------------------------------------------------------

On many Linux distributions the default ethernet MTU is 1500 bytes. This will also be the MTU size for RoCE interfaces
unless changed.

An MTU of 1500 is a performance limiter for HPC applications due to aggressive data segmentation. For the best
performance, MTU should be set to 9000 on the host and the maximum allowable MTU on the switch, which is
greater than 9000 on most high-performance switches. You may need to check your switch documentation for the specific
maximum value.

You can identify this error by running ``ib_write_bw -a`` from RDMA Perftests. The run completed the error message
``Completion with error <x>`` when the message size is greater than 1500. Reduced performance on RCCL
``all_reduce`` runs can further corroborate the problem.

.. _amd-gpu-drivers-not-loaded:

AMD drivers not loaded
------------------------------------------------------------------------------------------------------------------------

At the time of publication, it's recommended to manually load AMD drivers after the OS has fully booted for system
running MI200 and MI300 series GPUs. If you try to run applications with ROCm without loading the drives, you'll get the
following errors:

* ``no ROCm-capable device is detected`` when running anything from rccl-tests.
* ``Couldn't initialize ROCm device`` when running ``ib_write_bw --use_rocm=n`` commands.

To resolve, run ``sudo modprobe amdgpu`` to load the drivers.

.. _RCCL-bootstrap-mismatch:

RCCL bootstrap interface mismatch
------------------------------------------------------------------------------------------------------------------------

RCCL needs a bootstrapping interface for management, and requires this interface have an identical name across all
nodes. This can cause a problem with RCCL runs if a cluster has been misconfigured with inconsistent interface names and
``NCCL_SOCKET_IFNAME`` parameter is set to an interface that's not available on some nodes. You may see this issue
manifest as failed RCCL runs with an MPI/RCCL error or an indefinite system hang.

One way to diagnose this error is to include the ``NCCL_DEBUG=WARN`` parameter with RCCL runs. The run returns a
``NCCL WARN Bootstrap : no socket interface found`` error if there's a problem with the bootstrap interface.

To resolve, ensure the ``NCCL_SOCKET_IFNAME`` parameter is included in your RCCL commands and that it is assigned an
interface that exists on all nodes in the cluster.

.. _ld-library-misconfiguration:

Misconfigured LD_LIBRARY_PATH
------------------------------------------------------------------------------------------------------------------------

GPU distributed jobs depend on a deep software stack and the shared libraries of each individual component in the stack
must be accessible through the ``LD_LIBRARY_PATH`` environment variable. Otherwise, jobs will fail because they cannot
find OpenMPI, UCX, RCCL, or higher-level application libraries. The default RCCL shared object should be added to
``LD_LIBRARY_PATH`` when ROCm is installed, but if you download and manually compile a custom version RCCL, you must
specify the path to the RCCL library.

You can diagnose this problem through the following error messages:

* ``librccl.so not found`` or ``librccl-net.so not found``
* ``libmpi.so not found`` or ``libprrte.so not found``
* ``libuc*.so not found``

To resolve, provide an updated ``LD_LIBRARY_PATH`` value as a RCCL parameter:

.. code-block:: shell 
  
  mpirun ... -x LD_LIBRARY_PATH=<path_to_ompi>/ompi/lib:<path_to_rocm>/rocm-x.y.z/lib:<path_to_ucx>/ucx-x.y.z/lib:$LD_LIBRARY_PATH ...

.. _mca-exclude-interfaces:

MPI traffic across loopback, Docker, or VM interface 
------------------------------------------------------------------------------------------------------------------------

If there is virtualization or Docker software installed on a Linux system, Open MPI often defaults to using the docker
or virtual interface for initialization. This cause the job to fail since the Docker or virtual interface cannot
communicate with the others nodes in the cluster.

Methods to diagnose this issue include:

* Depending on the software stack, an Open MPI job may hang indefinitely.
* Depending on the software stack, an Open MPI may return the error message: ``send() to socket failed: Connection refused``

To resolve, always exclude Docker or virtual interfaces from jobs when they are present on a node. The parameters ``-mca
-oob_tcp_if_exclude=virbr0,docker,lo`` and ``-mca btl_tcp_if_exclude=virbr0,docker,lo`` exclude the interfaces
from both out-of-band communication and message passing communication. While loopback is typically excluded from Open MPI
by default, it should be added to the flags as a best a practice.

.. _BIOS-misconfiguration:

BIOS misconfiguration
------------------------------------------------------------------------------------------------------------------------

The default settings in your system BIOS may not be optimal for network performance. For example, if memory interleaving
is disabled as a default option in your BIOS you may see notably lower performance in RDMA operations.

Low performance is the most observable indicator of BIOS misconfiguration, but can have multiple possible causes. The
best approach to this issue one of prevention by ensuring your system BIOS is in alignment with AMD's optimization
guides:

* For MI3XX systems - `AMD Instinct MI300X Customer Acceptance Guide <https://instinct.docs.amd.com/projects/system-acceptance/en/latest/gpus/mi300x.html#mi300x-bios-settings>`_
* For MI2XX systems - `AMD Instinct MI200 Customer Acceptance Guide <https://instinct.docs.amd.com/projects/system-acceptance/en/latest/gpus/mi250.html#system-bios-settings>`_  

.. _ACS-disabled-baremetal:

ACS enabled on baremetal systems
------------------------------------------------------------------------------------------------------------------------

PCIe ACS is a security feature that enforces isolation between PCIe devices by routing all incoming traffic through the
PCIe root-complex first as a security checkpoint. For GPU RDMA this is a significant performance bottleneck as each data
transfer between the NIC and GPU gains additional latency when passing through the root complex.

When diagnosing low performance, ensuring ACS is disabled for all PCIe devices is a standard practice along with
checking BIOS settings and PCIe speeds. You can verify the status of ACS your devices by running ``sudo lspci -vvv |
grep -i "acsctl"`` from the command line:

.. code-block:: shell

  $ sudo lspci -vvv | grep -i "acsctl"

  ACSCtl: SrcValid- TransBlk- ReqRedir- CmpltRedir- UpstreamFwd- EgressCtrl- DirectTrans-
  ACSCtl: SrcValid- TransBlk- ReqRedir- CmpltRedir- UpstreamFwd- EgressCtrl- DirectTrans-
  ACSCtl: SrcValid- TransBlk- ReqRedir- CmpltRedir- UpstreamFwd- EgressCtrl- DirectTrans-
  ACSCtl: SrcValid+ TransBlk- ReqRedir- CmpltRedir- UpstreamFwd- EgressCtrl- DirectTrans-
  ACSCtl: SrcValid+ TransBlk- ReqRedir- CmpltRedir- UpstreamFwd- EgressCtrl- DirectTrans-
  ACSCtl: SrcValid- TransBlk- ReqRedir- CmpltRedir- UpstreamFwd- EgressCtrl- DirectTrans-
  ACSCtl: SrcValid- TransBlk- ReqRedir- CmpltRedir- UpstreamFwd- EgressCtrl- DirectTrans-
  ACSCtl: SrcValid- TransBlk- ReqRedir- CmpltRedir- UpstreamFwd- EgressCtrl- DirectTrans-
  
In this example, ``SrcValid+`` indicates a device still has ACS enabled. AMD provides a `disable ACS script
<https://github.com/ROCm/cluster-networking/blob/main/general_scripts/dis_acs.sh>`_ that you can run on your nodes to
systematically disable ACS for all PCIe devices.

.. note:: 
   Some systems offer a BIOS option to disable PCIe ACS, but before using it you should verify it disables ACS
   on every PCIe endpoint and bridge. In many cases, the BIOS only disables ACS on a subset of PCIe devices. To 
   disable ACS on all devices, the best practice is to run ``setpci`` commands in the OS as demonstrated in the 
   disable ACS script.

.. _disable-kernel-numa-balancing:

Kernel NUMA balancing enabled
------------------------------------------------------------------------------------------------------------------------

ROCm uses ``hipHostMalloc`` to manage NUMA (Non-Uniform Memory Access) pinning, automatically allocating memory from
the NUMA node nearest to the GPU and minimizing host-to-GPU transfer times. Kernel NUMA balancing must therefore be
disabled to avoid any additional overhead from migrating the memory utilized by ROCm and ensure optimal performance.

There are two ways to disable kernel NUMA balancing:

#. You can temporarily disable kernel NUMA balancing by running ``sudo sh -c 'echo 0 >
   /proc/sys/kernel/numa_balancing'``

#. To permanently disable kernel NUMA balancing, edit ``/etc/default/grub`` and add the string ``numa_balancing=0`` to
   the ``GRUB_CMDLINE_LINUX_DEFAULT`` line.

#. Run ``sudo update-grub && sudo reboot``.

.. _downgraded-pcie-link:

Downgraded PCIe link
------------------------------------------------------------------------------------------------------------------------

Low results from ``ib_write_bw`` and rccl-tests can occur when a PCIe link in the data path is in a downgraded state,
meaning the speed and/or width is lower than it ought to be. Review the :ref:`Single-node networking guide instructions
<PCie-device-speed-width>` and ensure all PCI links are operating at sufficient capacity.

.. _frontend-nic-RCCL-traffic:

RCCL traffic going through frontend NICs
------------------------------------------------------------------------------------------------------------------------

When the NICs that carry GPU traffic are not specified, RCCL's default behavior is to use all available RDMA interfaces. This
becomes a problem if RDMA interface are being used for frontend services like storage, since the frontend NICs tend to
have lower speed than the GPU-connected backend NICs and likely use a different switch as well, which can cause data
transfers to make additional network hops or become unroutable to the backend switches. 

A general indicator of this issue is lower-than-expected bandwidth on RCCL tests, but you can get more specific by
including the ``NCCL_DEBUG=info`` parameter on jobs and see if frontend NICs are being used to transfer data.

To resolve, always specify the backend NICs by using the ``NCCL_IB_HCA`` parameter. Usage is detailed in
:ref:`Multi-node RCCL operations <multi-node-rccl>`.

Dynamic load balancing is disabled
------------------------------------------------------------------------------------------------------------------------

In leaf-spine network topologies, relying solely on ECMP (Equal-Cost Multi-Path) with statically hashed paths can result
in hotspots, depending on the application. Hotspots occur when specific switch ports become over-utilized during peak
traffic periods. To address this issue, dynamic load balancing (DLB) improves ECMP routing by continuously monitoring
transmit buffer occupancy and link utilization. This proactive approach enables DLB to efficiently redirect flows to
alternative paths, significantly alleviating congestion.

If DLB is not enabled, you may notice that nodes on the same leaf switches show high rccl-tests allreduce bandwidth, but
nodes on different leaf switches show lower allreduce bandwidth when traffic crosses the spine switches.

To resolve, review your switch user guide for specific steps to enable DLB.