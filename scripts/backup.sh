#!/usr/bin/env bash
# 债市生存游戏 · 一键本地备份脚本
#
# 用法：
#   bash scripts/backup.sh                          # 自动用 git describe 当版本号
#   bash scripts/backup.sh v1.3-XXX_说明            # 指定版本号
#
# 输出：
#   1. 完整目录快照 → 备份盘/v<版本号>_<日期>_<说明>/  （含 .git，能 checkout 任何 tag）
#   2. 数据库冷备   → 备份盘/db_snapshots/leaderboard_v<版本号>_<日期>.db
#
# 注意：
#   - 纯本地备份，不上传任何远端
#   - 排除 node_modules / *.log / .DS_Store（重装 npm install 即可）
#   - 保留 .git（含完整历史）和 leaderboard.db（玩家数据）
#   - 敏感文件（.env / DS api.md）由 .gitignore 管，本地备份会包含（毕竟是本地）

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# 工作区分类后，备份盘统一在 04_备份/ 下
WORKSPACE_ROOT="$(cd "$PROJECT_ROOT/.." && pwd)"
BACKUP_ROOT="${WORKSPACE_ROOT}/04_备份/债券生存游戏_备份"
# 兼容旧路径（如果有人没用分类目录直接放工作区根级）
if [ ! -d "$BACKUP_ROOT" ] && [ -d "${WORKSPACE_ROOT}/债券生存游戏_备份" ]; then
  BACKUP_ROOT="${WORKSPACE_ROOT}/债券生存游戏_备份"
fi
DB_SNAP_DIR="$BACKUP_ROOT/db_snapshots"

cd "$PROJECT_ROOT"

# ─── 1. 决定版本号 ───
if [ $# -gt 0 ]; then
  VERSION_LABEL="$1"
else
  # 自动用最近 tag + 短 hash
  VERSION_LABEL="$(git describe --tags --always 2>/dev/null || echo unknown)"
fi
DATE_TAG="$(date +%Y-%m-%d)"
TIME_TAG="$(date +%H%M)"
BACKUP_NAME="${VERSION_LABEL}_${DATE_TAG}"

# 如果同名已存在，加时间戳避免覆盖
TARGET_DIR="$BACKUP_ROOT/$BACKUP_NAME"
if [ -e "$TARGET_DIR" ]; then
  TARGET_DIR="${TARGET_DIR}_${TIME_TAG}"
fi

echo "========================================"
echo "  债市生存游戏 · 本地备份"
echo "========================================"
echo "源:    $PROJECT_ROOT"
echo "目标:  $TARGET_DIR"
echo "版本:  $VERSION_LABEL"
echo ""

# ─── 2. 完整目录快照 ───
echo "[1/3] rsync 完整目录..."
mkdir -p "$TARGET_DIR"
rsync -a \
  --exclude='node_modules/' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  --exclude='leaderboard.db-shm' \
  --exclude='leaderboard.db-wal' \
  "$PROJECT_ROOT/" "$TARGET_DIR/"
SIZE=$(du -sh "$TARGET_DIR" 2>/dev/null | awk '{print $1}')
echo "  完成 · $SIZE"

# ─── 3. 数据库冷备（用 sqlite3 .backup 保证一致性，不会拷到半截写入的状态）───
echo "[2/3] 数据库冷备..."
mkdir -p "$DB_SNAP_DIR"
DB_SRC="$PROJECT_ROOT/api/leaderboard.db"
DB_DEST="$DB_SNAP_DIR/leaderboard_${VERSION_LABEL}_${DATE_TAG}.db"
if [ -e "$DB_DEST" ]; then
  DB_DEST="${DB_DEST%.db}_${TIME_TAG}.db"
fi
if [ -e "$DB_SRC" ]; then
  sqlite3 "$DB_SRC" ".backup '$DB_DEST'"
  ROWS=$(sqlite3 "$DB_DEST" "SELECT COUNT(*) FROM scores;" 2>/dev/null || echo "?")
  DB_SIZE=$(du -h "$DB_DEST" | awk '{print $1}')
  echo "  完成 · $DB_SIZE · scores 表 $ROWS 行 → $DB_DEST"
else
  echo "  跳过 (没有 leaderboard.db)"
fi

# ─── 4. 写一份元数据 ───
echo "[3/3] 写备份元数据..."
META_FILE="$TARGET_DIR/_BACKUP_INFO.txt"
cat > "$META_FILE" <<EOF
债市生存游戏 · 本地备份信息
======================================
备份版本:   $VERSION_LABEL
备份时间:   $(date '+%Y-%m-%d %H:%M:%S')
备份大小:   $SIZE
源目录:     $PROJECT_ROOT
git 状态:   $(git log -1 --oneline 2>/dev/null || echo unknown)
当前分支:   $(git branch --show-current 2>/dev/null || echo unknown)
所有 tag:
$(git tag -l 2>/dev/null | sed 's/^/    /')

恢复方法:
  1. 整体回滚:  rsync -a "$TARGET_DIR/" $PROJECT_ROOT/
  2. 仅 git 回滚到此版本:  cd $PROJECT_ROOT && git checkout $VERSION_LABEL
  3. 数据库恢复:  cp $DB_DEST $DB_SRC

注意:
  - 此备份纯本地，不包含 node_modules（用 'npm install' 在 root + api/ 各装一遍）
  - 数据库 .db 是 sqlite3 .backup 出来的一致性快照（不会有写入半截状态）
EOF

echo ""
echo "========================================"
echo "  ✓ 备份完成"
echo "========================================"
echo "目录:    $TARGET_DIR ($SIZE)"
echo "数据库:  $DB_DEST"
echo "元数据:  $META_FILE"
echo ""
echo "查看所有备份:"
echo "  ls -lh \"$BACKUP_ROOT\""
