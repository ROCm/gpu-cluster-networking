.. meta::
   :description: Central hub for AMD Instinct™ cluster design and deployment documentation.
   :keywords: network validation, DCGPU, PCIe, Infiniband, RoCE, ROCm, RCCL, machine learning, LLM, usage, tutorial
   :html_theme.sidebar_secondary.remove: true

.. raw:: html

   <div class="id-hero-eyebrow">
      <span class="id-hero-eyebrow-rule"></span>AMD Instinct™ — Cluster Design and Deployment   
   </div>

************************************************************************************************************************
Cluster Documentation Hub
************************************************************************************************************************

.. raw:: html

   <style>
   /* Landing page only: hide footers (this style ships only in index.html) */
   .prev-next-footer,
   .bd-footer-content,
   .rocm-footer {
       display: none;
   }
   </style>

.. raw:: html
   
   <div class="id-deck id-deck--primary">
   <div class="id-deck-head">
     <div class="id-section-label">Start here</div>
     <h2 class="id-deck-title">Design and Guides</h2>
     <p class="id-deck-sub">Configure, validate, and optimize AMD Instinct™-based clusters.</p>
   </div>
   <div class="id-grid">
   <a class="id-card" href="https://instinct.docs.amd.com/projects/system-acceptance/en/latest/">
     <span class="id-card-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg></span>
     <span class="id-card-title">Instinct Customer Acceptance Guide</span>
     <span class="id-card-desc">Comprehensive guide for configuring, validating, benchmarking, and baselining AMD Instinct&trade;-based systems.</span>
     <span class="id-card-go" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span>
   </a>
   <a class="id-card" href="overview.html">
     <span class="id-card-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg></span>
     <span class="id-card-title">Cluster Networking Guide</span>
     <span class="id-card-desc">Optimize the network for AMD Instinct™ GPU applications.</span>
     <span class="id-card-go" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span>
   </a>
   <a class="id-card" href="https://instinct.docs.amd.com/projects/MI3XX-reference/latest/index.html">
     <span class="id-card-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M20 9h2M20 14h2M2 9h2M2 14h2"/></svg></span>
     <span class="id-card-title">MI3XX Reference Design</span>
     <span class="id-card-desc">Reference design materials and topology examples for the AMD Instinct™ MI3XX platform.</span>
     <span class="id-card-go" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span>
   </a>
   <a class="id-card" href="https://instinct.docs.amd.com/projects/dc-design/latest/index.html">
     <span class="id-card-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M12 6h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/><path d="M8 6h.01"/><path d="M9 22v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/><rect x="4" y="2" width="16" height="20" rx="2"/></svg></span>
     <span class="id-card-title">Data Center Design Guide</span>
     <span class="id-card-desc">How to plan and design the modern AI data center.</span>
     <span class="id-card-go" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span>
   </a>
   <a class="id-card" href="https://docs.amd.com/v/u/en-US/AMD_Instinct_AMD-DriveNets_System_Reference_Architecture_RF-72513">
     <span class="id-card-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2"/><rect x="14" y="2" width="8" height="8" rx="1"/></svg></span>
     <span class="id-card-title">AMD-DriveNets System Reference Architecture</span>
     <span class="id-card-desc">Validated, end-to-end reference architecture for building and operating large-scale AI GPU clusters using AMD Instinct MI350-series (MI355X) compute paired with the DriveNets AI Fabric networking solution.</span>
     <span class="id-card-go" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span>
   </a>
   </div>
   </div>

.. raw:: html

   <div class="id-deck">
   <div class="id-deck-head">
     <div class="id-section-label">Reference</div>
     <h2 class="id-deck-title">Articles and Overviews</h2>
     <p class="id-deck-sub">Technical analyses and background reading that span AMD Instinct™ products.</p>
   </div>
   <div class="id-grid">
   <a class="id-card" href="https://rocm.blogs.amd.com/artificial-intelligence/amd-comparative-analysis/README.html">
     <span class="id-card-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg></span>
     <span class="id-card-title">Comparative Analysis of Scale-Out RoCE Network Traffic Patterns and Loads in Training Large Language Models</span>
     <span class="id-card-desc">Compares RoCE network traffic patterns and loads across GPT-4, Llama 3, DeepSeek-V2, and Grok 4.0 LLM training.</span>
     <span class="id-card-go" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span>
   </a>
   <a class="id-card" href="https://rocm.blogs.amd.com/artificial-intelligence/amd-net-traffic/README.html">
     <span class="id-card-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg></span>
     <span class="id-card-title">AMD Instinct™ Network Traffic, Congestion Trends, and Harmonics in Scale-Out Networks for AI Training Clusters</span>
     <span class="id-card-desc">Explore how synchronized GPU collectives create harmonic congestion in AI clusters and the strategies to diagnose and mitigate it.</span>
     <span class="id-card-go" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span>
   </a>
   </div>
   </div>
