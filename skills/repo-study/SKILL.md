---
name: repo-study-local
description: "在当前 opencli-study 项目内执行 repo-study 工作流（status/sync）"
---

# repo-study-local

本 skill 封装当前项目的 study 管理命令，统一从 `skills/repo-study/scripts/` 执行。

## Commands

1. `status`：检查当前目录 study 状态（支持远程版本比对）
   - `./skills/repo-study/scripts/repo-study-status.sh`
   - `./skills/repo-study/scripts/repo-study-status.sh --json --check-remote`

2. `sync`：同步 study 笔记到 Obsidian
   - `./skills/repo-study/scripts/repo-study-sync-ob.sh --dry-run --project opencli-study`
   - `./skills/repo-study/scripts/repo-study-sync-ob.sh --project opencli-study`

## Notes

- 根目录 `scripts/repo-study-*.sh` 仅做兼容转发，请优先使用本 skill 路径。
- 元数据依赖 `.study-meta.json` v2 结构。
