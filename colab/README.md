# Google Colab Operations

Phase 14 Colab setup assets.

Use `setup_colab.py` inside a Colab notebook or Colab shell after cloning the repository. It creates the expected runtime storage folders and checks the required command-line tools.

```python
!python colab/setup_colab.py --storage-root /content/ovaf-storage --drive-root /content/drive/MyDrive/ovaf
```

The script does not install system packages or copy project files. Follow `docs/COLAB_OPERATIONS.md` for the full setup, sync and resume workflow.
