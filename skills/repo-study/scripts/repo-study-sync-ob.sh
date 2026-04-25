#!/bin/bash
# repo-study-sync-ob.sh — 将 study 项目的 notes 同步到 Obsidian
#
# 功能：
#   1. 扫描 GitHub 项目目录下所有 *-study 项目
#   2. 为每个有笔记的项目创建 symlink（OB → study/notes）
#   3. 生成/更新每个项目的 index.md 概述页
#   4. 生成/更新 open-source/index.md 总索引
#
# 用法：
#   ./repo-study-sync-ob.sh              # 全量同步
#   ./repo-study-sync-ob.sh --dry-run    # 预览变更
#   ./repo-study-sync-ob.sh --project xxx-study  # 只同步指定项目

set -euo pipefail

# ============ 配置 ============
OB_VAULT="/Users/jiashengwang/jacky-github/jacky-obsidian"
STUDY_BASE="/Users/jiashengwang/jacky-github"
OB_OPEN_SOURCE="$OB_VAULT/wiki/open-source"

# ============ 参数解析 ============
DRY_RUN=false
TARGET_PROJECT=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run) DRY_RUN=true; shift ;;
    --project) TARGET_PROJECT="$2"; shift 2 ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

# ============ 工具函数 ============

info() { echo "ℹ️  $*"; }
ok()   { echo "✅ $*"; }
skip() { echo "⏭️  $*"; }
dry()  { echo "🔍 [DRY] $*"; }

run_cmd() {
  if $DRY_RUN; then
    dry "$@"
  else
    "$@"
  fi
}

# 读取 study 项目的元数据
get_meta_value() {
  local meta_file="$1"
  local key="$2"
  if [ -f "$meta_file" ]; then
    python3 -c "import json; d=json.load(open('$meta_file')); print(d.get('$key','—'))" 2>/dev/null || echo "—"
  else
    echo "—"
  fi
}

# 获取项目的简短描述
get_project_description() {
  local claude_md="$1"
  if [ -f "$claude_md" ]; then
    # 读取第一行 > 开头的描述
    sed -n '/^>/p' "$claude_md" | head -1 | sed 's/^> //'
  fi
}

# 统计笔记数（排除 RESEARCH-LOG.md）
count_notes() {
  local notes_dir="$1"
  if [ -d "$notes_dir" ]; then
    find "$notes_dir" -name "*.md" ! -name "RESEARCH-LOG.md" | wc -l | tr -d ' '
  else
    echo "0"
  fi
}

# ============ 主逻辑 ============

info "开始同步 study 项目到 Obsidian..."

# 确保 OB 目录存在
if [ ! -d "$OB_OPEN_SOURCE" ]; then
  run_cmd mkdir -p "$OB_OPEN_SOURCE"
  ok "创建目录: $OB_OPEN_SOURCE"
fi

# 收集项目数据
declare -a PROJECTS=()
declare -a DESCS=()
declare -a NOTES_COUNTS=()
declare -a SOURCE_REPOS=()

total_notes=0

for dir in "$STUDY_BASE"/*-study; do
  [ -d "$dir" ] || continue
  name=$(basename "$dir")

  # 如果指定了项目，只处理该项目
  if [ -n "$TARGET_PROJECT" ] && [ "$name" != "$TARGET_PROJECT" ]; then
    continue
  fi

  notes_count=$(count_notes "$dir/notes")

  # 跳过没有笔记的项目
  if [ "$notes_count" -eq 0 ]; then
    skip "$name — 0 篇笔记，跳过"
    continue
  fi

  source_repo=$(get_meta_value "$dir/.study-meta.json" "sourceRepo")
  desc=$(get_project_description "$dir/CLAUDE.md")
  [ -z "$desc" ] && desc="（暂无描述）"

  PROJECTS+=("$name")
  DESCS+=("$desc")
  NOTES_COUNTS+=("$notes_count")
  SOURCE_REPOS+=("$source_repo")
  total_notes=$((total_notes + notes_count))

  # Step 1: 创建项目目录和 symlink
  run_cmd mkdir -p "$OB_OPEN_SOURCE/$name"

  if [ -L "$OB_OPEN_SOURCE/$name/notes" ]; then
    # symlink 已存在，检查是否指向正确
    current_target=$(readlink "$OB_OPEN_SOURCE/$name/notes")
    if [ "$current_target" = "$dir/notes" ]; then
      ok "$name — symlink 已正确"
    else
      run_cmd rm "$OB_OPEN_SOURCE/$name/notes"
      run_cmd ln -s "$dir/notes" "$OB_OPEN_SOURCE/$name/notes"
      ok "$name — symlink 已更新 → $dir/notes"
    fi
  elif [ -e "$OB_OPEN_SOURCE/$name/notes" ]; then
    info "$name — notes 不是 symlink，跳过"
  else
    run_cmd ln -s "$dir/notes" "$OB_OPEN_SOURCE/$name/notes"
    ok "$name — symlink 已创建 → $dir/notes"
  fi
done

echo ""
info "共 ${#PROJECTS[@]} 个项目，$total_notes 篇笔记"
echo ""

if $DRY_RUN; then
  info " Dry run 模式，未修改任何文件"
  exit 0
fi

# Step 2: 生成 index.md（仅当文件不存在时）
for i in "${!PROJECTS[@]}"; do
  name="${PROJECTS[$i]}"
  index_file="$OB_OPEN_SOURCE/$name/index.md"

  if [ -f "$index_file" ]; then
    skip "$name/index.md — 已存在，不覆盖"
  else
    # 生成简单的 index.md
    source_repo="${SOURCE_REPOS[$i]}"
    desc="${DESCS[$i]}"
    notes="${NOTES_COUNTS[$i]}"

    cat > "$index_file" << EOF
---
tags: [open-source, study]
source_repo: $source_repo
type: project-index
updated_at: $(date +%Y-%m-%d)
---

# $name

> $desc

## 笔记索引

- 📂 [[open-source/$name/notes|notes/]] — 所有研究笔记（symlink，$notes 篇）
EOF
    ok "$name/index.md — 已生成"
  fi
done

# Step 3: 生成总索引
info "生成 open-source/index.md ..."

{
  echo "---"
  echo "tags: [open-source, index]"
  echo "type: index"
  echo "updated_at: $(date +%Y-%m-%d)"
  echo "---"
  echo ""
  echo "# 开源研究"
  echo ""
  echo "> 通过 repo-study 研究的开源项目索引。每个项目通过 symlink 直接引用 study 仓库的 notes，在 OB 中编辑即可同步到 GitHub。"
  echo ""

  # 按类别分组（简单版：全部列在一个表格中）
  echo "| 项目 | 描述 | Notes |"
  echo "|------|------|-------|"
  for i in "${!PROJECTS[@]}"; do
    name="${PROJECTS[$i]}"
    desc="${DESCS[$i]}"
    notes="${NOTES_COUNTS[$i]}"
    # 截断过长描述
    short_desc=$(echo "$desc" | cut -c1-60)
    [ ${#desc} -gt 60 ] && short_desc="${short_desc}..."
    echo "| [[open-source/$name/index\\|$name]] | $short_desc | $notes |"
  done

  echo ""
  echo "## 统计"
  echo ""
  echo "- **项目总数**：${#PROJECTS[@]} 个"
  echo "- **笔记总数**：$total_notes 篇"
  echo "- **Symlink 同步**：所有 notes 目录通过 symlink 引用，OB 中编辑直接同步"
} > "$OB_OPEN_SOURCE/index.md"

ok "open-source/index.md — 已更新"

echo ""
ok "同步完成！"
