"""Configuration file for the Sphinx documentation builder."""
import os

html_baseurl = os.environ.get("READTHEDOCS_CANONICAL_URL", "instinct.docs.amd.com")
html_context = {}
if os.environ.get("READTHEDOCS", "") == "True":
    html_context["READTHEDOCS"] = True

project = "AMD Instinct Data Center Design Guide"
html_title = "Data Center Design Guide"
author = "Advanced Micro Devices, Inc."
copyright = "Copyright (c) 2026 Advanced Micro Devices, Inc. All rights reserved."
version = "1.0"
release = version
setting_all_article_info = False

external_toc_path = "./sphinx/_toc.yml"

external_projects_current_project = "dc-design"
external_projects_remote_repository = ""

html_theme = "rocm_docs_theme"
html_theme_options = {
    "flavor": "instinct-design",
    "show_toc_level": 2,
    "navbar_align": "content",
    "link_main_doc": True,
    "use_download_button": True,
}
extensions = ["rocm_docs"]

html_static_path = ['_static']

# Disable sidebars to handle minimal TOC
html_sidebars = {
    "**": []
}


# Generate llms.txt and llms-full.txt after each build (the llms.txt standard,
# https://llmstxt.org/). See the rocm-docs-core guide:
# https://rocm.docs.amd.com/projects/rocm-docs-core/en/latest/user_guide/llms.html
rocm_docs_generate_llms = True


def setup(app):
    app.add_css_file('css/custom.css')
