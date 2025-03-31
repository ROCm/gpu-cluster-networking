.. meta::
   :description: How to configure RoCE on NICs and switches for AMD Instinct products
   :keywords: RoCE, DCGPU, NIC, switch, ROCm, RCCL, machine learning, LLM, usage, tutorial

************************************************
RDMA over Converged Ethernet Configuration Guide 
************************************************

RDMA over Converged Ethernet (RoCE) is a network protocol can deliver speeds comparable to InfiniBand when running
AI/HPC workloads, and offer lower cost than InfiniBand due their compatibility with standard ethernet architecture.

This guide contains instructions for optimizing the performance of a RoCE cluster network by at the network interface
card (NIC) and switch level with proper configuration, as well as routing directions to mitigate issues like MAC address
mismatch (ARP flux) that can occur establishing RDMA sessions on nodes with multiple NICs.

Configuration for RoCE-capable NICs
====================================

The specific steps to configure your NIC for RoCE support differ based on the NIC manufacturer. As this guide cannot
provide steps for every potential manufacturer, this section provides some high-level recommendations of what to look
for when setting up RoCE NICs according to the most common manufacturers, but always defers to manufacturer
documentation for complete setup.

Install NIC firmware and driver
-------------------------------

NIC drivers typically include a regular ethernet driver, a RoCE driver, and a peer-mem (aka GPU direct RDMA), depending
on the vendor. 

Specific installation steps vary from vendor to vendor and may differ between NIC models from the same vendor. Here are
a few examples of public vendor documentation for installing RoCE drivers:

* `Installing RoCE Drivers for Broadcom NICs <https://techdocs.broadcom.com/us/en/storage-and-ethernet-connectivity/ethernet-nic-controllers/bcm957xxx/adapters/software-installation/installing-the-linux-driver/installing-the-l2-and-roce-drivers-using-the-automated-installer.html#installing-the-l2-and-roce-drivers-using-the-automated-installer_title_1>`_
* `RDMA Support for Intel NICs <https://edc.intel.com/content/www/us/en/design/products/ethernet/adapters-and-devices-user-guide/remote-direct-memory-access-rdma/>`
  
Always consult vendor-specific instructions in addition to this guide when configuring your NIC. You may need to reach
out directly to the vendor if instructions are not publicly available.

  .. note::
    The latest driver for a NIC may require a Linux kernel that is not yet supported by the AMD ROCm/amdgpu software
     stack. Before updating, review the `supported operating systems for ROCm
     <https://rocm.docs.amd.com/projects/install-on-linux/en/latest/reference/system-requirements.html#supported-operating-systems>`_
     and verify the driver kernel is one supported by the version of ROCm you have installed.

Set static NIC speed
--------------------

Most high-speed network adapters support multiple speeds and are often configured with a default "auto-negotiation"
feature that dynamically sets the speed based on network conditions. It's a best practice to disable this feature and
configure a single static network speed instead. This avoids unexpected changes in speed and simplified debugging if you
encounter performance issues.

Enable RoCE support mode
------------------------

Most RoCE-capable NICs have a feature flag that must be set before they can communicate through RDMA. As the default
setting for this feature differs by NIC vendor and model, you must averify all NICs are configured to support RoCE
before running tests.

As an example, Broadcom NICs use the ``support_rdma`` flag to govern this feature. You can check the status with the
`NICCLI <https://techdocs.broadcom.com/us/en/storage-and-ethernet-connectivity/ethernet-nic-controllers/bcm957xxx/adapters/Configuration-adapter/nic-cli-configuration-utility/nic-configuration-utility.html>`_
configuration tool:

.. tab-set::

   .. tab-item:: Shell output

      .. code-block:: shell

         $ sudo niccli -i 3 nvm -getoption support_rdma -scope 0

         support_rdma = False

   .. tab-item:: Command

      ::

         sudo niccli -i <NIC index> nvm -getoption support_rdma -scope <scope index>
         
In this case, the NIC is not configured to support RoCE, so run ``nvm -setoption`` to enable it:

.. tab-set::

   .. tab-item:: Shell output

      .. code-block:: shell

         $ sudo niccli -i 3 nvm -setoption support_rdma -value 1 -scope 0  
         
         support_rdma is set successfully

   .. tab-item:: Command

      ::

         sudo niccli -i <NIC index> nvm -setoption support_rdma -value <value> -scope <scope index>

Other vendors use different utilities and flags to control this setting; refer to vendor-specific documentation in these
scenarios. For Broadcom NICs, you can also refer to the :ref:`Broadcom RoCE configuration
scripts<RoCE-configuration-script-for-Broadcom-Thor-NIC>` provided in the networking guides to review and configure RDMA
support in bulk on each NIC in a node.

Enable PCIe relaxed ordering
----------------------------

Configuring relaxed ordering for your NICs can offer performance improvement by changing the ordering rules that govern
data transfers in the base PCIe specification. As with RoCE support, how to enable this feature differs based on vendor
and NIC model, but examples from Broadcom NICs are provided in this guide as a starting framework.

.. note::
   NIC configuration is only one part of enabling PCIe relaxed ordering. You must also ensure your server architecture
   supports relaxed ordering and that it is enabled in BIOS on each node in your cluster. 

To check relaxed ordering on a Broadcom NIC, use `NICCLI <https://techdocs.broadcom.com/us/en/storage-and-ethernet-connectivity/ethernet-nic-controllers/bcm957xxx/adapters/Configuration-adapter/nic-cli-configuration-utility/nic-configuration-utility.html>`_:

.. tab-set::

   .. tab-item:: Shell output

      .. code-block:: shell

         $ sudo niccli -i 3 nvm -getoption pcie_relaxed_ordering
                  
         pcie_relaxed_ordering = Enabled

   .. tab-item:: Command

      ::

         sudo niccli -i <NIC index> nvm -getoption pcie_relaxed_ordering

If ``pcie_relaxed_ordering`` shows a ``disabled`` value, you can enable it with this command:

.. tab-set::

   .. tab-item:: Shell output

      .. code-block:: shell

         $ sudo niccli -i 3 nvm -setoption pcie_relaxed_ordering -value 1
                
         pcie_relaxed_ordering is set successfully
         Please reboot the system to apply the configuration

   .. tab-item:: Command

      ::

         sudo niccli -i <NIC index> nvm -setoption pcie_relaxed_ordering -value <value>

For other vendors, refer to vendor-specific documentation for information about how to verify and enable this setting.
Additionally, for Broadcom NICs you can also refer to the :ref:`Broadcom RoCE configuration
scripts<RoCE-configuration-script-for-Broadcom-Thor-NIC>` provided in the networking guides to review and configure
relaxed ordering in bulk on each NIC in a node.

Disable ACS and set IOMMU passthrough
-------------------------------------

On any nodes hosting GPUs, ensure you disable ACS and configure IOMMU passthrough to ensure peer to peer transfer
between NICs and GPUs functions as expected.

To disable ACS, use the :ref:`disable ACS script<disable-acs-script>` provided in the single-node network guide. To set
IOMMU passthrough on a Linux system, adding ``iommu=pt`` to the ``GRUB_CMDLINE_LINUX_DEFAULT`` entry in
``/etc/default/grub``, then run ``sudo update-grub``. You can see a more detailed flow at
:ref:`rocm:mi300x-grub-settings` and :ref:`rocm-install-on-linux:multi-gpu`.

* Enable RoCE, PFC, ECN, set proper speed for the NIC port(s), and other vendor-suggested NIC features.
* For setting up Broadcom Thor2 NICs, review the :ref:`Broadcom RoCE configuration
  scripts<RoCE-configuration-script-for-Broadcom-Thor-NIC>` in the single node networking guide.

Enable DCQCN through QoS configuration
---------------------------------------

Data Center Quantized Congestion Notification (DCQCN) is a traffic control method achieved by enabling two features,
Explicit Congestion Notification (ECN) and Priority Flow Control (PFC), to support end-to-end lossless ethernet in a
datacenter environment.

In communication between NICs, ECN detects congestion in PCIe switch buffers and alerts the endpoint (receiving NIC)
through packet ECN bits. The receiving NIC then transmits a congestion notification package (CNP) to the sending NIC to
reduce the transfer rate. If congestion is still too high for a specific traffic class with ECN in effect, PFC pauses
traffic for that class until congestion is resolved.   

ECN and PFC are configured per NIC through quality of service (QoS) parameters. Refer to your vendor-specific
documentation on how to set the following parameters for your NICs:

* RoCE priority class.
* Enable PFC on RoCE priority class.
* Set CNP priority class (usually the highest priority of 7).

.. dropdown:: Example of default QoS configuration on a Broadcom Thor2 NIC

   .. tab-set::

      .. tab-item:: Shell output

         .. code-block:: shell

            # RoCE v2 packets are marked with a  DSCP value 26 and use Priority 3 internally
            # CNP packets are marked with a DSCP value 48 and use Priority 7 internally
            # PFC is enabled for Priority 3 traffic
            # Three Traffic classes are set up, TC0 for non RoCE traffic, TC1 for RoCE traffic, and TC2 for CNP traffic
            # RoCE and non-RoCE traffic share ETS bandwidth of 50% each. The ETS bandwidth share applies only when the actual traffic is available to use the bandwidth share. In the absence of non-RoCE traffic, all the available bandwidth will be used by RoCE and vice-versa.
            # CNP traffic is treated as ETS Strict Priority
            
            $ sudo niccli -dev 1 get_qos
                      
            IEEE 8021QAZ ETS Configuration TLV:
                     PRIO_MAP: 0:0 1:0 2:0 3:1 4:0 5:0 6:0 7:2
                     TC Bandwidth: 50% 50% 0%
                     TSA_MAP: 0:ets 1:ets 2:strict
            IEEE 8021QAZ PFC TLV:
                     PFC enabled: 3
            IEEE 8021QAZ APP TLV:
                     APP#0:
                     Priority: 7
                     Sel: 5
                     DSCP: 48
            
                     APP#1:
                     Priority: 3
                     Sel: 5
                     DSCP: 26
            
                     APP#2:
                     Priority: 3
                     Sel: 3
                     UDP or DCCP: 4791
            
            TC Rate Limit: 100% 100% 100% 0% 0% 0% 0% 0%
            
            $ sudo niccli -dev 1 dump pri2cos

            Base Queue is 0 for port 0
            ----------------------------
            Priority   TC   Queue ID
            ------------------------
            0         0    4
            1         0    4
            2         0    4
            3         1    0
            4         0    4
            5         0    4
            6         0    4
            7         2    5
            
            $ sudo niccli -dev 1 get_dscp2prio

            dscp2prio mapping:
                     priority:7  dscp: 48
                     priority:3  dscp: 26

      .. tab-item:: Commands

         ::

            sudo niccli -dev <NIC index> get_qos

            sudo niccli -dev <NIC index> dump pri2cos

            sudo niccli -dev <NIC index> get_dscp2prio

NIC QoS troubleshooting
-----------------------

Sometimes, the default QoS on a NIC may differ significantly from that recommended by Broadcom in the `BCM957608
Ethernet Networking Guide for AMD Instinct MI300X GPU Clusters (pages
38-42)<https://docs.broadcom.com/doc/957608-AN2XX>`_, even if the RoCE profile has been set in NVM.

If you determine this is the case for any of your NICs, follow these steps to resolve:

#.	Run the ``install.sh`` script provided in the Broadcom NIC release package.

    .. code-block:: shell
      
      $ cd bcm5760x_<version.x.y.z>/utils/linux_installer/
      
      $ bash install.sh -i <interface_name> -o ECNPFC -f -b 50 -w

    The flags can be understood as follows: 
    
    *	-o ECNPFC: Enables PFC and sets traffic priority, sets DSCP values for RoCE traffic and CNP traffic.
    *	-b 50: At minimum RoCE will occupy 50% of bandwidth.
    *	-w: Assumes proper firmware is already installed and skips it.

#.	Once the script completes, run ``sudo reboot`` to prevent the RoCE driver warning about unmatched DSCP values.

#.	Verify the QoS is now correct. Run ``sudo niccli -dev 1 getqos`` and ensure it matches the example in the previous
  	section, paying particular attention to PFC state, traffic classes, and DSCP values.

Switch Configuration
====================

You will need direct or remote access to switches in your cluster to configure them for optimal data transfer over a
RoCE network. This guide provides instructions for Dell and Arista and switches using SONiC and Arista EOS respectively.

Switch authentication and configuration terminal access
-------------------------------------------------------

The first step is to log in to the switch and elevate your permissions so that you can change configurations.

.. tab-set::

   .. tab-item:: Dell switches
      
      #. Access your switch CLI with ssh.

      #. Run ``sonic-cli`` as a command.

      #. Run ``configure`` or ``configure terminal`` as a command to enter configuration mode.

      #. Run ``exit`` as a command at any time to leave configuration mode.

   .. tab-item:: Arista switches

      #. Access your switch CLI with ssh.

      #. Run ``enable`` as a command to receive elevated privileges.

      #. Run ``configure terminal`` as a command to enter configuration mode.

      #. Run ``exit`` as a command at any time to leave configuration mode.

Enable RoCE support
-------------------

.. tab-set::

   .. tab-item:: Dell switches

      #. While in configuration mode, run ``roce enable`` as a command.

      #. Reboot the switch when or if prompted.

   .. tab-item:: Arista switches

      Arista EOS supports RoCE communication by default. Instead, ensure the PFC for the RoCE traffic class is enabled
      on each port that handles RoCE traffic.

Implement standard extended naming for switch interfaces
--------------------------------------------------------

Dell recommends what is referred to as the "standard" or "standard extended" naming convention for switch interfaces.
The naming scheme is understood as ``Eth<line_card_id>/<port_id>/[breakout_port_id]``. In a fixed switch this naming
scheme simplifies matching each port to its front-panel label, where ``Eth1/16/[x]`` corresponds to port 16 as
physically labeled on the switch. The line card ID also remains 1 since there is a single line card.

However, if multiple line cards are present in a modular switch like the Arista 7388X5 series, additional effort is
required to match the port name to its physical label.


.. tab-set::

   .. tab-item:: Dell switches

      #. While in configuration mode, run ``interface-naming standard extended`` as a command.

      #. Run ``write memory`` as a commdn.

      #. Log out of the switch, then log back in to view the change in interface names.

         .. code-block:: shell

            Interface Name Vendor Part No. Serial No. QSA Adapter Qualified
            --------------------------------------------------------------------------------------------------------------------------------------
            Eth1/1 QSFP56-DD 400GBASE-SR8-AEC-3.0M DELL EMC DH11M CN0F9KR711I0060 N/A True
            Eth1/2 QSFP56-DD 400GBASE-SR8-AEC-3.0M DELL EMC DH11M CN0F9KR711I0042 N/A True
            Eth1/3 QSFP56-DD 400GBASE-SR8-AEC-3.0M DELL EMC DH11M CN0F9KR70CO0095 N/A True
            ...
            Eth1/64      QSFP56-DD 400GBASE-SR8-AEC-3.0M         DELL EMC          DH11M             CN0F9KR70CM0041   N/A               True
            Eth1/65      N/A                                     N/A               N/A               N/A               N/A               False
            Eth1/66      N/A                                     N/A               N/A               N/A               N/A               False

   .. tab-item:: Arista switches

      Arista switches are pre-configured to use the standard extended naming convention, no additional action should be required.

Verify all connected transceivers are detected
----------------------------------------------

Once all physical cluster cabling is complete, check that your switch transceivers are detected and online.

.. tab-set::

   .. tab-item:: Dell switches

      #. While in configuration mode, run ``show interface transceiver summary | no-more``.

      #. Verify all transceivers appear in the interface list.

         .. code-block:: shell

            --------------------------------------------------------------------------------------------------------------------------------------
            Interface    Name                                    Vendor            Part No.          Serial No.        QSA Adapter       Qualified
            --------------------------------------------------------------------------------------------------------------------------------------
            Eth1/1       QSFP56-DD 400GBASE-SR8-AEC-3.0M         DELL EMC          DH11M             CN0F9KR711I0060   N/A               True
            Eth1/2       QSFP56-DD 400GBASE-SR8-AEC-3.0M         DELL EMC          DH11M             CN0F9KR711I0042   N/A               True
            Eth1/3       QSFP56-DD 400GBASE-SR8-AEC-3.0M         DELL EMC          DH11M             CN0F9KR70CO0095   N/A               True
            Eth1/4       QSFP56-DD 400GBASE-SR8-AEC-3.0M         DELL EMC          DH11M             CN0F9KR70CQ0026   N/A               True
            ...

   .. tab-item:: Arista switches

      #. While in configuration mode, run ``show inventory``.
      
      #. Verify all transceivers appears in the interface list.

         .. code-block:: shell

            System has 54 switched transceiver slots
              Port Manufacturer     Model            Serial Number    Rev
              ---- ---------------- ---------------- ---------------- ----
              1    Arista Networks  DCS-7050TX-72Q
              2    Arista Networks  DCS-7050TX-72Q
              3    Arista Networks  DCS-7050TX-72Q
              4    Arista Networks  DCS-7050TX-72Q
              5    Arista Networks  DCS-7050TX-72Q

Configure switch links
----------------------

Link training is used to calibrate the network signal between two devices over a physical, copper-based ethernet cable.
This is typically a requirement when running a direct access cable (DAC) but discouraged for optics (`Dell SmartFabric
OS10 User Guide Release 10.5.6<https://www.dell.com/support/manuals/en-us/smartfabric-os10-emp-partner/smartfabric-os-user-guide-10-5-6/link-training?guid=guid-24a06e82-8337-4b4a-acd1-4b1d4af45943&lang=en-us>`_).

If you require link training, enable it on both your NIC and switch OS.

.. tab-set::
   
   .. tab-item:: Broadcom NIC

      You can run ``niccli`` to enable link training on your NICs:

      ``niccli -dev 1 nvm -setoption link_training -value [0|1] -scope 0``   
   
   .. tab-item:: Dell switches

      If your switch ports are connected to non-DAC cables you should diable link training:

      #. While in configuration mode, run ``interface range`` as a command to select an interface range such as ``Eth
         1/1-1/32``.
      
      #. Run ``no shutdown`` as a command .

      #. Run ``no standalone-link-training`` as a command.

      .. code-block:: shell

         $ (config)# interface range Eth 1/1-1/32
         
         %Info: Configuring only existing interfaces in range
         
         $ (config-if-range-eth**)# no shutdown
         
         $ (config-if-range-eth**)# no standalone-link-training

      For switch port connected to DAC cables:

      #. While in configuration mode, run ``interface range`` as a command to select an interface range such as ``Eth
         1/1-1/32``.

      #. Run ``no shutdown`` as a command.

      #. Run ``standalone-link-training`` as a command.

      .. code-block:: shell

         $ (config-if-range-eth**)# interface range Eth 1/33-1/64
         
         %Info: Configuring only existing interfaces in range
         
         $ (config-if-range-eth**)# no shutdown
         
         $ (config-if-range-eth**)# standalone-link-training    

   .. tab-item:: Arista switches

      #. While in configuration mode, run ``interface Ethernet`` as a command to select an interface range such as
         ``1-32``.

      #. Run ``no shutdown`` as a command.

      .. code-block:: shell
         
         $ (config)# interface Ethernet 1-32
         
         $ (config-if-Et1-32)# no shutdown

.. Important::
  Some Arista switches are observed to not support autonegotiation or standalone link training on the edge ports (eth1, 
  eth2, eth31-34, eth63, eth64) when running older versions of Arista EOS. This causes a situation where you must either
  only use DACs in the switch ports that can enable link training or disable link training on all ports and the NIC to 
  allow full usage of the switch.

  Since neither approach is ideal, the preferred solution is to update Arista EOS to version 4.33.0F or later, which 
  should allow standalone link training and autonegotiation on all ports.

Link support training matrix
****************************

Refer to the table below as a reference for whether standalone link training should be enabled or not based on your
switch OS and cable type.

+-----------------------+------------+------------------+----------------+-----------------------------+
| Switch OS             | cable type | port speed       |  link training | BRCM NIC NVM link training  |
+=======================+============+==================+================+=============================+
| Arista EOS >= 4.33.0F | optics     | 400 - no autoneg | off            | off                         |
| Arista EOS >= 4.33.0F | DAC        | 400 - no autoneg | on             | on                          |
| Dell Sonic            | optics     | 400 - no autoneg | off            | off                         |
| Dell Sonic            | DAC        | 400 - no autoneg | on             | on                          |
| Dell OS10             | Optics     | 400 - no autoneg | N/A            | off                         |
| Dell OS10             | DAC        | 400 - no autoneg | N/A            | on                          |
+-----------------------+------------+------------------+----------------+-----------------------------+

Match switch QoS configuration to NIC for DCQCN
-----------------------------------------------

It's critical that the configuration you set up on a NIC be matched by your switch. Refer to the `BCM957608 Ethernet
Networking Guide for AMD Instinct MI300X GPU Clusters (pages 38-42)<https://docs.broadcom.com/doc/957608-AN2XX>`_ as a
reference; the configuration detailed there is a good baseline for most switches and NICs. 

DCQCN in Arista EOS can be summarized as:

*	Enable PFC on all ports. 
*	RoCE and CNP DSCP values match those set on the NIC. 
*	Enable ECN and configure ECN thresholds.

.. drop-down:: Example - DCQCN configuration on an Arista 7388 switch

   .. code-block:: shell

      !!! Map traffic RoCE and CNP classes (TC) to their DSCP to match NIC config
      qos map traffic-class 3 to dscp 26
      qos map traffic-class 7 to dscp 48
       
      !!! Define PFC settings and ECN buffer thresholds for RoCE traffic. Note that ECN buffer thresholds can be optimized later depending on the workload running on the cluster.
      qos profile QOS_ROCE_DCQCN
         qos trust dscp
         priority-flow-control on
         priority-flow-control priority 3 no-drop
         !
         uc-tx-queue 3
            random-detect ecn minimum-threshold 2000 segments maximum-threshold 10000 segments max-mark-probability 20 weight 0
            random-detect ecn count
      !
       
      !!! Sample switch port configuration. Note speed was set to 200GbE because the NICs on nodes had a 200GbE speed.
      interface Ethernet2/5/1
         load-interval 2
         mtu 9214
         speed 200g-4
         error-correction encoding reed-solomon
         ip address 1.1.122.14/31
         phy link training
         service-profile QOS_ROCE_DCQCN
      !
      interface Ethernet2/5/5
         load-interval 2
         mtu 9214
         speed 200g-4
         error-correction encoding reed-solomon
         ip address 1.1.122.24/31
         phy link training
         service-profile QOS_ROCE_DCQCN
      !

For SONIC running on Dell switches, most of the configuration below will be auto generated when the command `enable roce` is
run. Just make sure that the QoS configuration generated on the switch match those on the NICs. 

.. drop-down:: Example - DCQCN configuration on Dell Z9664f-O64 switch using sonic-cli

   .. code-block:: shell

      !!! Configure ECN buffer thresholds for RoCE traffic. Thresholds can be adjusted later depending on network performance.
      !
      qos wred-policy ROCE
      green minimum-threshold 2048 maximum-threshold 12480 drop-probability 15
      ecn green
      !
      qos scheduler-policy ROCE
      !
      queue 0
      type dwrr
      weight 50
      !
      queue 3
      type dwrr
      weight 50
      !
      queue 4
      type dwrr
      weight 50
      !
      queue 6
      type strict
      !
      qos map dscp-tc ROCE
      dscp 0-3,5-23,25,27-47,49-63 traffic-class 0
      dscp 24,26 traffic-class 3
      dscp 4 traffic-class 4
      dscp 48 traffic-class 6
      !
      qos map dot1p-tc ROCE
      dot1p 0-2,5-7 traffic-class 0
      dot1p 3 traffic-class 3
      dot1p 4 traffic-class 4
      !
      qos map tc-queue ROCE
      traffic-class 0 queue 0
      traffic-class 1 queue 1
      traffic-class 2 queue 2
      traffic-class 3 queue 3
      traffic-class 4 queue 4
      traffic-class 5 queue 5
      traffic-class 6 queue 6
      traffic-class 7 queue 7
      !
      qos map tc-pg ROCE
      traffic-class 3 priority-group 3
      traffic-class 4 priority-group 4
      traffic-class 0-2,5-7 priority-group 7
      !
      qos map pfc-priority-queue ROCE
      pfc-priority 0 queue 0
      pfc-priority 1 queue 1
      pfc-priority 2 queue 2
      pfc-priority 3 queue 3
      pfc-priority 4 queue 4
      pfc-priority 5 queue 5
      pfc-priority 6 queue 6
      pfc-priority 7 queue 7
      !
      qos map pfc-priority-pg ROCE
      pfc-priority 0 pg 0
      pfc-priority 1 pg 1
      pfc-priority 2 pg 2
      pfc-priority 3 pg 3
      pfc-priority 4 pg 4
      pfc-priority 5 pg 5
      pfc-priority 6 pg 6
      pfc-priority 7 pg 7
      !
      hardware
      !
      access-list
      counters per-entry
      !
      tcam
      !
      line vty
      service-policy type qos in oob-qos-policy
      !
      interface Loopback 0
      ip address 192.168.0.1/32
      !
      interface Eth1/1
      description Spine-Eth1/1
      mtu 9216
      speed 400000
      fec RS
      unreliable-los auto
      no shutdown
      ipv6 enable
      ars bind port_pro
      queue 3 wred-policy ROCE
      queue 4 wred-policy ROCE
      scheduler-policy ROCE
      qos-map dscp-tc ROCE
      qos-map dot1p-tc ROCE
      qos-map tc-queue ROCE
      qos-map tc-pg ROCE
      qos-map pfc-priority-queue ROCE
      qos-map pfc-priority-pg ROCE
      priority-flow-control priority 3
      priority-flow-control priority 4
      priority-flow-control watchdog action drop
      priority-flow-control watchdog on detect-time 200
      priority-flow-control watchdog restore-time 400
      !
      interface Eth1/2
      description Spine-Eth1/2
      mtu 9216
      speed 400000
      fec RS
      unreliable-los auto
      no shutdown
      ipv6 enable
      ars bind port_pro
      queue 3 wred-policy ROCE
      queue 4 wred-policy ROCE
      scheduler-policy ROCE
      qos-map dscp-tc ROCE
      qos-map dot1p-tc ROCE
      qos-map tc-queue ROCE
      qos-map tc-pg ROCE
      qos-map pfc-priority-queue ROCE
      qos-map pfc-priority-pg ROCE
      priority-flow-control priority 3
      priority-flow-control priority 4
      priority-flow-control watchdog action drop
      priority-flow-control watchdog on detect-time 200
      priority-flow-control watchdog restore-time 400
      !
      interface Eth1/3
      description Spine-Eth1/3
      mtu 9216
      speed 400000
      fec RS
      unreliable-los auto
      no shutdown
      ipv6 enable
      ars bind port_pro
      queue 3 wred-policy ROCE
      queue 4 wred-policy ROCE
      scheduler-policy ROCE
      qos-map dscp-tc ROCE
      qos-map dot1p-tc ROCE
      qos-map tc-queue ROCE
      qos-map tc-pg ROCE
      qos-map pfc-priority-queue ROCE
      qos-map pfc-priority-pg ROCE
      priority-flow-control priority 3
      priority-flow-control priority 4
      priority-flow-control watchdog action drop
      priority-flow-control watchdog on detect-time 200
      priority-flow-control watchdog restore-time 400
      !

Backend Network Routing
=======================

Understanding and preventing ARP flux
-------------------------------------

ARP flux occurs when an IP address is mapped to an incorrect MAC address in the ARP table. This is a known problem in
Linux hosts with multiple network interfaces on the same subnet, as any ARP request for an IP address to a host will
be answered by every available interface on that host.

For an HPC/AI cluster, an incorrect MAC address in the ARP table can have several impacts on RDMA traffic:

#. Communication may fail if the interface corresponding to the returned (incorrect) MAC address has no open RDMA
   session. 
#. Multiple IP addresses map to the same MAC address resulting in one NIC receiving excessive traffic while other NICs
   are idle, causing a performance bottleneck. 

This section discusses two methods for mitigating the effects for ARP flux: IPV4 configuration at the host level or
VLAN/L3 routing at the switch level.

Preventing ARP Flux with Linux Host IPV4 Configuration
------------------------------------------------------

You can set the IPV4 ``sysctl`` parameters for individual Linux hosts to prevent ARP flux. This method is most effective
when systems across the network are stable and do not frequently change OS.

To temporarily force only the correct NIC to respond to ARP, run the following commands:

   .. code-block:: shell
      
      sysctl -w net.ipv4.conf.all.arp_announce=1 # Ignore NICs not on subnet
      
      sysctl -w net.ipv4.conf.all.arp_ignore=2 # ignore NICs not matching exact IP addr

To make the change permanent, add these lines to ``/etc/sysctl.conf`` and reboot:

   .. code-block:: shell
      
      net.ipv4.conf.all.arp_announce = 1
      net.ipv4.conf.all.arp_ignore = 2

Preventing ARP Flux with individual subnets and L3 routing
----------------------------------------------------------

Instead of configuring the host's IPV4 parameters, you can leverage your network switches to isolate each NIC on a
unique subnet. ARP requests can then be sent through inter-VLAN or point-to-point routing to only reach one NIC at a
time.

Backend network routing with VLAN
*********************************

Routing with VLANs ensures any two backend network NICs can communicate with one another while preventing ARP flux.

The requirements for inter-VLAN routing are as follows:

* The number of VLANs must equal the number of backend NICs per host.
* For each host, a NIC is routed to only one switch VLAN. NIC1 on each host is routed to VLAN2, NIC2 on each host to
  VLAN2, and so on.
* If using SONIC as the switch OS, each VLAN is assigned an IP address on the switch side. On the server side, the VLAN
  IP address is specified as the gateway of the interface. 

.. dropdown:: Switch VLAN-based routing - Host 1 example with 8 NICs

    .. code-block:: shell

      network:
        ethernets:
          eth1:
            mtu: 9000
            addresses:
            - 192.168.2.1/24  # Unique subnet 192.168.2.X/24
            routing-policy:
              - from: 192.168.2.1
                table: 102
            routes:   # Everything from this interface routes to VLAN with IP address 192.168.2.254
              - to: 0.0.0.0/0
                via: 192.168.2.254    # VLAN IP address specified in the switch
                table: 102
          eth2:
            mtu: 9000
            addresses:
            - 192.168.3.1/24
            routing-policy:
              - from: 192.168.3.1
                table: 103
            routes:
              - to: 0.0.0.0/0
                via: 192.168.3.254
                table: 103
          eth3:
            mtu: 9000
            addresses:
            - 192.168.4.1/24
            routing-policy:
              - from: 192.168.4.1
                table: 104
            routes:
              - to: 0.0.0.0/0
                via: 192.168.4.254
                table: 104
          eth4:
            mtu: 9000
            addresses:
            - 192.168.5.1/24
            routing-policy:
              - from: 192.168.5.1
                table: 105
            routes:
              - to: 0.0.0.0/0
                via: 192.168.5.254
                table: 105
          eth5:
            mtu: 9000
            addresses:
            - 192.168.6.1/24
            routing-policy:
              - from: 192.168.6.1
                table: 106
            routes:
              - to: 0.0.0.0/0
                via: 192.168.6.254
                table: 106
          eth6:
            mtu: 9000
            addresses:
            - 192.168.7.1/24
            routing-policy:
              - from: 192.168.7.1
                table: 107
            routes:
              - to: 0.0.0.0/0
                via: 192.168.7.254
                table: 107
          eth7:
            mtu: 9000
            addresses:
            - 192.168.8.1/24
            routing-policy:
              - from: 192.168.8.1
                table: 108
            routes:
              - to: 0.0.0.0/0
                via: 192.168.8.254
                table: 108
          eth8:
            mtu: 9000
            addresses:
            - 192.168.9.1/24   
            routing-policy:
              - from: 192.168.9.1
                table: 109
            routes: 
              - to: 0.0.0.0/0
                via: 192.168.9.254
                table: 109
        version: 2

.. dropdown:: Switch VLAN-based routing - Host 2 example with 8 NICs

   .. code-block:: shell

      network:
        ethernets:
          eth1:
            mtu: 9000
            addresses:
            - 192.168.2.2/24 
            routing-policy:
              - from: 192.168.2.2
                table: 102
            routes:  
              - to: 0.0.0.0/0
                via: 192.168.2.254   
                table: 102
          eth2:
            mtu: 9000
            addresses:
            - 192.168.3.2/24
            routing-policy:
              - from: 192.168.3.2
                table: 103
            routes:
              - to: 0.0.0.0/0
                via: 192.168.3.254
                table: 103
          eth3:
            mtu: 9000
            addresses:
            - 192.168.4.2/24
            routing-policy:
              - from: 192.168.4.2
                table: 104
            routes:
              - to: 0.0.0.0/0
                via: 192.168.4.254
                table: 104
          eth4:
            mtu: 9000
            addresses:
            - 192.168.5.2/24
            routing-policy:
              - from: 192.168.5.2
                table: 105
            routes:
              - to: 0.0.0.0/0
                via: 192.168.5.254
                table: 105
          eth5:
            mtu: 9000
            addresses:
            - 192.168.6.2/24
            routing-policy:
              - from: 192.168.6.2
                table: 106
            routes:
              - to: 0.0.0.0/0
                via: 192.168.6.254
                table: 106
          eth6:
            mtu: 9000
            addresses:
            - 192.168.7.2/24
            routing-policy:
              - from: 192.168.7.2
                table: 107
            routes:
              - to: 0.0.0.0/0
                via: 192.168.7.254
                table: 107
          eth7:
            mtu: 9000
            addresses:
            - 192.168.8.2/24
            routing-policy:
              - from: 192.168.8.2
                table: 108
            routes:
              - to: 0.0.0.0/0
                via: 192.168.8.254
                table: 108
          eth8:
            mtu: 9000
            addresses:
            - 192.168.9.2/24   
            routing-policy:
              - from: 192.168.9.2
                table: 109
            routes: 
              - to: 0.0.0.0/0
                via: 192.168.9.254
                table: 109
        version: 2

.. dropdown:: Example - Sonic switch configuration with VLAN definitions
   
   .. code-block:: shell

      interface Vlan1
       description nic1_vlan
       ip address 192.168.2.254/24
      !
      interface Vlan2
       description nic2_vlan
       ip address 192.168.3.254/24
      !
      interface Vlan3
       description nic3_vlan
       ip address 192.168.4.254/24
      !
      interface Vlan4
       description nic4_vlan
       ip address 192.168.5.254/24
      !
      interface Vlan5
       description nic5_vlan
       ip address 192.168.6.254/24
      !
      interface Vlan6
       description nic6_vlan
       ip address 192.168.7.254/24
      !
      interface Vlan7
       description nic7_vlan
       ip address 192.168.8.254/24
      !
      interface Vlan8
       description nic8_vlan
       ip address 192.168.9.254/24
      !
       
      interface Eth1/1
       description "Node1 nic1"
       mtu 9100
       speed 400000
       fec RS
       standalone-link-training
       unreliable-los auto
       no shutdown
       switchport access Vlan 1
      !
      interface Eth1/2
       description "Node1 nic2"
       mtu 9100
       speed 400000
       fec RS
       standalone-link-training
       unreliable-los auto
       no shutdown
       switchport access Vlan 2
      !
      interface Eth1/3
       description "Node1 nic3"
       mtu 9100
       speed 400000
       fec RS
       standalone-link-training
       unreliable-los auto
       no shutdown
       switchport access Vlan 3
      !
      interface Eth1/4
       description "Node1 nic4"
       mtu 9100
       speed 400000
       fec RS
       standalone-link-training
       unreliable-los auto
       no shutdown
       switchport access Vlan 4
      !
      interface Eth1/5
       description "Node1 nic5"
       mtu 9100
       speed 400000
       fec RS
       standalone-link-training
       unreliable-los auto
       no shutdown
       switchport access Vlan 5
      !
      interface Eth1/6
       description "Node1 nic6"
       mtu 9100
       speed 400000
       fec RS
       standalone-link-training
       unreliable-los auto
       no shutdown
       switchport access Vlan 6
      !
      interface Eth1/7
       description "Node1 nic7"
       mtu 9100
       speed 400000
       fec RS
       standalone-link-training
       unreliable-los auto
       no shutdown
       switchport access Vlan 7
      !
      interface Eth1/8
       description "Node1 nic8"
       mtu 9100
       speed 400000
       fec RS
       standalone-link-training
       unreliable-los auto
       no shutdown
       switchport access Vlan 8
      !
      interface Eth1/9
       description "Node2 nic1"
       mtu 9100
       speed 400000
       fec RS
       standalone-link-training
       unreliable-los auto
       no shutdown
       switchport access Vlan 1
      !
      interface Eth1/10
       description "Node2 nic2"
       mtu 9100
       speed 400000
       fec RS
       standalone-link-training
       unreliable-los auto
       no shutdown
       switchport access Vlan 2
      !
      interface Eth1/11
       description "Node2 nic3"
       mtu 9100
       speed 400000
       fec RS
       standalone-link-training
       unreliable-los auto
       no shutdown
       switchport access Vlan 3
      !
      interface Eth1/12
       description "Node2 nic4"
       mtu 9100
       speed 400000
       fec RS
       standalone-link-training
       unreliable-los auto
       no shutdown
       switchport access Vlan 4
      !
      interface Eth1/13
       description "Node2 nic5"
       mtu 9100
       speed 400000
       fec RS
       standalone-link-training
       unreliable-los auto
       no shutdown
       switchport access Vlan 5
      !
      interface Eth1/14
       description "Node2 nic6"
       mtu 9100
       speed 400000
       fec RS
       standalone-link-training
       unreliable-los auto
       no shutdown
       switchport access Vlan 6
      !
      interface Eth1/15
       description "Node2 nic7"
       mtu 9100
       speed 400000
       fec RS
       standalone-link-training
       unreliable-los auto
       no shutdown
       switchport access Vlan 7
      !
      interface Eth1/16
       description "Node2 nic8"
       mtu 9100
       speed 400000
       fec RS
       standalone-link-training
       unreliable-los auto
       no shutdown
       switchport access Vlan 8
      !

Backend network routing with using /31 subnet point-to-point routing
********************************************************************

Since /31 subnets allows only two hosts (one for network and one for broadcast), they can be leveraged to prevent ARP
flux in a way similar to VLANs.

The requirements for point-to-point routing are:

* Each NIC on a host must have a /31 network mask (for example, 192.168.131.X/31).
* Each connected backend switch port must have an IP address that the NIC interface can use as a gateway.

.. Note:: 
  Point to point routing has a scaling limit of up to 128 NICs and is only recommended for small clusters. 

.. dropdown:: Example - Host netplan file that uses different subnets for the NICs
   
   .. code-block:: shell

      network:
        ethernets:
          enp28s0np0:
            mtu: 9000
            addresses:
            -  192.168.7.1/31
            routing-policy:
            - from: 192.168.7.1
              table: 101
            routes:
            - to: 0.0.0.0/0
              via: 192.168.7.0
              table: 101
          enp62s0np0:
            mtu: 9000
            addresses:
            - 192.168.8.1/31
            routing-policy:
            - from: 192.168.8.1
              table: 102
            routes:
            - to: 0.0.0.0/0
              via: 192.168.8.0
              table: 102
          enp79s0np0:
            mtu: 9000
            addresses:
            - 192.168.6.1/31
            routing-policy:
            - from: 192.168.6.1
              table: 103
            routes:
            - to: 0.0.0.0/0
              via: 192.168.6.0
              table: 103
          enp96s0np0:
            mtu: 9000
            addresses:
            - 192.168.5.1/31
            routing-policy:
            - from: 192.168.5.1
              table: 104
            routes:
            - to: 0.0.0.0/0
              via: 192.168.5.0
              table: 104
          enp158s0np0:
            mtu: 9000
            addresses:
            - 192.168.1.1/31
            routing-policy:
            - from: 192.168.1.1
              table: 105
            routes:
            - to: 0.0.0.0/0
              via: 192.168.1.0
              table: 105
          enp190s0np0:
            mtu: 9000
            addresses:
            - 192.168.2.1/31
            routing-policy:
            - from: 192.168.2.1
              table: 106
            routes:
            - to: 0.0.0.0/0
              via: 192.168.2.0
              table: 106
          enp206s0np0:
            mtu: 9000
            addresses:
            - 192.168.3.1/31
            routing-policy:
            - from: 192.168.3.1
              table: 107
            routes:
            - to: 0.0.0.0/0
              via: 192.168.3.0
              table: 107
          enp222s0np0:
            mtu: 9000
            addresses:
            - 192.168.4.1/31
            routing-policy:
            - from: 192.168.4.1
              table: 108
            routes:
            - to: 0.0.0.0/0
              via: 192.168.4.0
              table: 108
        version: 2

    
