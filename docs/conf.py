# Configuration file for the Sphinx documentation builder.
#
# This file only contains a selection of the most common options. For a full
# list see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# configurations for PDF output by Read the Docs
project = "GPU cluster networking documentation"
author = "Advanced Micro Devices, Inc."
copyright = "Copyright (c) 2024 Advanced Micro Devices, Inc. All rights reserved."
version = "0.1.0"
release = version
setting_all_article_info = False

external_toc_path = "./sphinx/_toc.yml"

extensions = ["rocm_docs"]

external_projects_current_project = "gpu-cluster-networking"

html_theme = "rocm_docs_theme"
html_theme_options = {"flavor": "rocm-docs-home"}

html_title = project

html_theme_options = {"link_main_doc": True}
