.. meta::
   :description: How to configure RoCE on NICs and switches for AMD Instinct products
   :keywords: RoCE, DCGPU, NIC, switch, ROCm, RCCL, machine learning, LLM, usage, tutorial

***********************************************
RoCE Configuration Guide for Cluster Networking
***********************************************

RDMA over Converged Ethernet (RoCE) networks allow for speeds comparable to InfiniBand when running AI/HPC workloads, provided that the correct configuration steps have been taken on both individual NICs and switches. This guide provides instruction on how to appropriately configure your network for RoCE at the NIC and switch level and how to mitigate MAC address mismatches (ARP flux) that can affect nodes with multiple NICs when establishing RDMA sessions.

NIC Configuration
=================

The specific steps to configure your NIC for RoCE support differ based on the NIC manufacturer. As this guide cannot provide steps for every potential manufacturer, this section provides some high-level recommendations of what to look for when setting up RoCE NICs according to the most common manufacturers, but always defers to manufacturer documentation for complete setup.

* Install or update the NIC driver and firmware.
  
  .. note::
     The latest driver for a NIC may require a Linux kernel that is not yet support by the AMD ROCm/amdgpu software stack. Before updating, review the `supported operating systems for ROCm <https://rocm.docs.amd.com/projects/install-on-linux/en/latest/reference/system-requirements.html#supported-operating-systems>`_ verify the driver kernel is one supported by the version of ROCm you have installed.

* Enable RoCE, PFC, ECN, set proper speed for the NIC port(s), and other vendor-suggested NIC features.

* For setting up Broadcom Thor2 NICs, review the :ref:`Broadcom RoCE configuration scripts<RoCE-configuration-script-for-Broadcom-Thor-NIC>` in the single node networking guide.

Switch Configuration
====================

Switch configuration steps also differ based on manufacturer, but in general you can expect that you must establish SSH access to the switch OS to properly configure it for RoCE. These instructions are written for a Dell PowerSwitch running Sonic OS.

#. Login to switch and activate ``sonic-cli``.

   #. Initial SSH to switch opens bash CLI. Here you can copy files from remote and update OS level configurations.

      .. code-block:: shell

         You are on
         ____   ___  _   _ _  ____
         / ___| / _ \| \ | (_)/ ___|
         \___ \| | | |  \| | | |
         ___) | |_| | |\  | | |___
         |____/ \___/|_| \_|_|\____|
         
         -- Software for Open Networking in the Cloud --
         
         Unauthorized access and/or use are prohibited.
         All access and/or use are subject to monitoring.
         
         Help:    http://azure.github.io/SONiC/
         
         Last login: Fri Jun 14 01:15:40 2024 from ###.##.#.###
         
         $ pwd
         
         /home/admin

   #. Run ``sonic-cli`` to enter configuration read mode for the switch. This lets you review different switch configurations, but you can't edit or overwrite them.

      .. code-block:: shell

         $ sonic-cli
         
         $ show version   
         
         Software Version  : 4.3.0-Enterprise_Standard
         Product           : Enterprise SONiC Distribution by Dell Technologies
         ...    

   #. To change or edit the switch configuration, run the ``configure`` command while in the sonic-cli shell.

      .. code-block:: shell
      
         $ configure

         (config)$ 


      To exit configuration mode, run the ``exit`` command.

#. Set interfaces to use extended naming (``Eth1/1``, ``Eth1/2``, and so on). The use of ``write memory`` in the example makes the configuration change permanent (persists through switch reboots).      

   .. code-block:: shell

      (config)$ interface-naming standard extended
      
      (config)$ write memory

#. Verify all connected cables and transceivers are recognized with ``show interface transceiver summary``. This is a useful way to determine that all cables and transceivers are properly connected to the switch. This truncated example demonstrates detection of all 64 cables connected to a switch.

   .. code-block:: shell

      $ show interface transceiver summary | no-more

      --------------------------------------------------------------------------------------------------------------------------------------
      Interface    Name                                    Vendor            Part No.          Serial No.        QSA Adapter       Qualified
      --------------------------------------------------------------------------------------------------------------------------------------
      Eth1/1       QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/2       QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/3       QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/4       QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/5       QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/6       QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/7       QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/8       QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/9       QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/10      QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/11      QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/12      QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/13      QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      <SNIP> --------------------------------------------------------------------------------------------------------------------------
      Eth1/56      QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/57      QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/58      QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/59      QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/60      QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/61      QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/62      QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/63      QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/64      QSFP56-DD 400GBASE-SR8-AEC-3.0M         ********          *****             ***************   N/A               True
      Eth1/65      N/A                                     N/A               N/A               N/A               N/A               False
      Eth1/66      N/A                                     N/A               N/A               N/A               N/A               False

#. Configure links on the switch.

   #. For switch ports that connect to other switches, run the ``no shutdown`` command to bring them online, then ensure link training is disabled with the ``no standalone-link-training`` command. The following example demonstrates the configuration of 32 ports (port 1 to port 32) too a leaf switch that connects to an upper spine switch.

      .. code-block:: shell
         
         (config)$ interface range Eth 1/1-1/32
         
         %Info: Configuring only existing interfaces in range
         
         (config-if-range-eth**)$ no shutdown
         
         (config-if-range-eth**)$ no standalone-link-training

   #. For switch ports that connect to host NICs, the ``no shutdown`` command still applies, but link training should be enabled instead.

      .. code-block:: shell

         (config-if-range-eth**)$ interface range Eth 1/33-1/64
         
         %Info: Configuring only existing interfaces in range
         
         (config-if-range-eth**)$ no shutdown
         
         (config-if-range-eth**)$ standalone-link-training
         
         (config-if-range-eth**)$

#. Enable RoCE on the switch. Note that a reboot is required for the congfiuration to take effect.

   .. code-block:: shell

      $ sonic-cli
      
      $ configure terminal
      
      (config)$ roce enable
      
      This command will also restart the node after saving all configurations,if ROCE is configured first time or force-default. [Proceed y/N]: y

ARP Flux Mitigation
===================

ARP flux is a problem that occurs in Linux hosts with multiple network interfaces. Typically when a remote system transfers data to another system it will have the IP address but not the MAC address, and sends an ARP request to all hosts on the subnet to discover the MAC.

ARP flux happens when the request reaches the host with the target IP and the host responds with the MAC address of any NIC it has on the subnet, which may not correspond to the NIC with the correct IP address. This can cause failures in RDMA workloads if a local host receives the wrong remote MAC address and then tries to establish an RDMA session with a NIC that has no RDMA session running.

This section discusses two methods for mitigating the effects for ARP flux: IPV4 configuration at the host level or VLAN/L3 routing at the switch level.

ARP Flux Prevention With Linux Host IPV4 Configuration
------------------------------------------------------

You can set the IPV4 sysctl parameters for individual Linux hosts to prevent ARP flux. This method is best used when systems across the network are stable and do not frequently change OS.

To temporarily force only the correct NIC to respond to ARP, run the following commands:

   .. code-block:: shell
      
      sysctl -w net.ipv4.conf.all.arp_announce=1 # Ignore NICs not on subnet
      
      sysctl -w net.ipv4.conf.all.arp_ignore=2 # ignore NICs not matching exact IP addr

To make the change permanent, add these lines to ``/etc/sysctl.conf`` and reboot:

   .. code-block:: shell
      
      net.ipv4.conf.all.arp_announce = 1
      net.ipv4.conf.all.arp_ignore = 2

ARP Flux Prevention With VLAN or L3 Routing
-------------------------------------------

Instead of configuring the host's IPV4 parameters, you can leverage your network switches to ensure ARP requests are routed only to the specified NIC. Specific instructions differ based on switch manufacturer and are beyond the scope of this guide, but conceptually you can either isolate each NIC on a specified VLAN, or assign them to separate subnets.
