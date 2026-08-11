"""Configuration file for the Sphinx documentation builder."""
import os

html_baseurl = os.environ.get("READTHEDOCS_CANONICAL_URL", "instinct.docs.amd.com")
html_context = {}
if os.environ.get("READTHEDOCS", "") == "True":
    html_context["READTHEDOCS"] = True

project = "AMD GPU Cluster Networking"
html_title = "Cluster Documentation Hub"
author = "Advanced Micro Devices, Inc."
copyright = "Copyright (c) 2026 Advanced Micro Devices, Inc. All rights reserved."
version = "0.1.0"
release = version
setting_all_article_info = False

external_toc_path = "./sphinx/_toc.yml"

external_projects_current_project = "gpu-cluster-networking"

html_theme = "rocm_docs_theme"
html_theme_options = {
    "flavor": "instinct-design",
    "link_main_doc": True,
    "use_download_button": True,
}
extensions = ["rocm_docs"]

html_static_path = ['_static']

# Disable the sidebar on the landing page only; other pages keep the theme default
html_sidebars = {
    "index": []
}


# Generate llms.txt and llms-full.txt after each build (the llms.txt standard,
# https://llmstxt.org/). See the rocm-docs-core guide:
# https://rocm.docs.amd.com/projects/rocm-docs-core/en/latest/user_guide/llms.html
rocm_docs_generate_llms = True


def setup(app):
    app.add_css_file('css/custom.css')
