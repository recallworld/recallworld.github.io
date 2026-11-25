<p align="center">
  <img src="assets/branding/e1275424cbdc73aa340b7fa9351f6ca79fc7b9fce77369a3034a7812b2fc5449.png" alt="RecallWorld logo" width="540">
</p>

<h1 align="center">RecallWorld: Episodic Memory for Persistent Embodied Video World Models</h1>

<p align="center">
  <a href="https://sarosijbose.github.io/">Sarosij Bose</a><sup>1,2</sup>, <a href="https://scholar.google.com/citations?user=R14csHAAAAAJ">Gitika Karumuri</a><sup>1</sup>, <a href="https://scholar.google.com/citations?user=u_lYTIwAAAAJ&amp;hl=en">Chenqi Li</a><sup>1,3</sup>, <a href="https://tuallen.github.io/">Allen Tu</a><sup>1,4</sup>, <a href="https://vishu26.github.io/">Srikumar Sastry</a><sup>1,5</sup>, <a href="https://meilongzhang.github.io/">Mellon Zhang</a><sup>1,6</sup>, <a href="https://scholar.google.com/citations?user=28p_eLYAAAAJ">Avinash Ravichandran</a><sup>1</sup>, <a href="https://www.alexander-schwing.de/">Alexander Schwing</a><sup>1,7</sup>, <a href="https://scholar.google.com/citations?user=4Urexvi1sIcC">Konstantinos Karydis</a><sup>2</sup>, <a href="https://vcg.ece.ucr.edu/amit">Amit K. Roy Chowdhury</a><sup>2</sup>
</p>

<p align="center">
  <sup>1</sup> <a href="https://www.amazon.science/">Amazon</a> · <sup>2</sup> <a href="https://www.ucr.edu/">University of California, Riverside</a> · <sup>3</sup> <a href="https://www.ox.ac.uk/">University of Oxford</a> · <sup>4</sup> <a href="https://umd.edu/">University of Maryland, College Park</a> · <sup>5</sup> <a href="https://washu.edu/">Washington University in St. Louis</a> · <sup>6</sup> <a href="https://www.gatech.edu/">Georgia Institute of Technology</a> · <sup>7</sup> <a href="https://illinois.edu/">University of Illinois Urbana-Champaign</a>
</p>

<p align="center">
  <a href="https://recallworld.github.io/">Website</a> · <a href="https://arxiv.org/abs/2611.28666">arXiv</a>
</p>

<p align="center">
  <img src="assets/readme/paper-teaser-d869532f42979f01.png" alt="Main-paper Figure 1: episodic Scenelet memory and faithful revisits" width="1000">
</p>

## Abstract

Video world models generate plausible novel views but often lack persistent memory, failing to preserve a place's geometry and appearance when an agent revisits a scene. A central challenge is how previous views should be effectively used for creating memory. Reconstructing them independently underutilizes geometric constraints between nearby views, while repeatedly reconstructing a growing history can propagate later prediction errors into earlier geometry. We introduce RecallWorld, a persistent embodied video world model that jointly reconstructs short multi-view episodes into Scenelets while keeping geometry independent across episodes. Starting from a single source image, camera-aware ray lifting places perspective and native fisheye images in a common world frame, retaining wide-field content for perspective generation. Each generated segment extends the Scenelet memory and conditions subsequent generation. Coverage-based retrieval selects complementary Scenelets from the full history, while target-view visibility is resolved geometrically before appearance fusion, providing consistent memory conditioning for guiding subsequent generation. Across four datasets, RecallWorld improves revisit PSNR over the strongest evaluated baseline by 2.6 dB on partial revisits and 3.9 dB on full cycles, demonstrating substantially stronger preservation of scene identity across exploration and return.

## BibTeX

```bibtex
@misc{bose2026recallworldepisodicmemorypersistent,
      title={{RecallWorld}: Episodic Memory for Persistent Embodied Video World Models},
      author={Bose, Sarosij and Karumuri, Gitika and Li, Chenqi and Tu, Allen and Sastry, Srikumar and Zhang, Mellon and Ravichandran, Avinash and Schwing, Alexander and Karydis, Konstantinos and {Roy Chowdhury}, Amit K.},
      year={2026},
      eprint={2611.28666},
      archivePrefix={arXiv},
      primaryClass={cs.CV},
      url={https://arxiv.org/abs/2611.28666}
}
```

## Acknowledgements

RecallWorld builds on [SANA-WM](https://github.com/NVlabs/Sana), with [π³](https://github.com/yyfz/Pi3), [Depth Anything 3](https://github.com/ByteDance-Seed/Depth-Anything-3), and [UniK3D](https://github.com/lpiccinelli-eth/UniK3D) for geometry and range estimation. We thank their authors, and the authors of [GrandTour](https://grand-tour.leggedrobotics.com/), [M2DGR](https://github.com/SJTU-ViSYS/M2DGR), [TartanGround](https://tartanair.org/tartanground/), and [DL3DV](https://github.com/DL3DV-10K/Dataset) for their datasets.

This work was completed during an internship at [Amazon](https://www.amazon.science/). We thank [Ziyang Long](https://ziyanglong.cn/), [Amin Kheradmand](https://scholar.google.com/citations?user=5DJL154AAAAJ), [David Stafford](https://www.linkedin.com/in/davidwstafford), [Yen-Liang Lin](https://sites.google.com/view/yenlianglin), [Shifan Zhu](https://shifanzhu.github.io/), [Yun He](https://yunhe20.github.io/), [Guy Satat](https://guysatat.com/), [Sravan Sripada](https://www.amazon.science/author/sravan-sripada), and [Prakriti Chintalapoodi](https://www.amazon.science/author/prakriti-chintalapoodi) for helpful discussions and feedback.
