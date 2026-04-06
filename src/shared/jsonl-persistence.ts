/**
 * Shared JSONL persistence utilities for rotation and file management
 */

import * as fs from 'fs';
import * as path from 'path';

// 备份清理配置
const MAX_BACKUP_COUNT = 5; // 最多保留 5 个备份文件
const MAX_BACKUP_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB 总大小限制

// 配置常量
const JSONL_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const JSONL_MAX_LINES = 10000; // 最大行数

export interface JsonlRotationConfig {
  maxSizeBytes?: number;
  maxLines?: number;
  maxBackupCount?: number;
  maxBackupTotalSize?: number;
}

/**
 * 检查并执行 JSONL 文件轮转
 */
export function rotateJsonlFileIfNeeded(
  filePath: string,
  config: JsonlRotationConfig = {}
): void {
  const {
    maxSizeBytes = JSONL_MAX_SIZE_BYTES,
    maxLines = JSONL_MAX_LINES,
  } = config;

  try {
    if (!fs.existsSync(filePath)) {
      return;
    }

    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // 检查文件大小
    if (fileSize >= maxSizeBytes) {
      performRotation(filePath, 'size', fileSize, config);
      return;
    }

    // 检查行数（如果文件不是特别大）
    if (fileSize > 0 && fileSize < 1024 * 1024) { // 小于 1MB 时检查行数
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      if (lines.length >= maxLines) {
        performRotation(filePath, 'lines', lines.length, config);
      }
    }
  } catch (error) {
    // 静默失败，不影响主流程
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[JsonlPersistence] Rotation check failed: ${errorMessage}`);
  }
}

/**
 * 执行文件轮转
 */
function performRotation(
  filePath: string,
  reason: 'size' | 'lines',
  metric: number,
  config: JsonlRotationConfig = {}
): void {
  const {
    maxBackupCount = MAX_BACKUP_COUNT,
    maxBackupTotalSize = MAX_BACKUP_TOTAL_SIZE,
  } = config;

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup-${timestamp}`;
    
    fs.renameSync(filePath, backupPath);
    
    // 创建新的空文件
    fs.writeFileSync(filePath, '', { encoding: 'utf8' });
    
    // 执行备份清理
    cleanupOldBackups(filePath, { maxBackupCount, maxBackupTotalSize });
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[JsonlPersistence] File rotated: ${reason}=${metric}, backup=${backupPath}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[JsonlPersistence] Rotation failed: ${errorMessage}`);
    // 不抛出，主流程继续
  }
}

/**
 * 清理旧的备份文件
 * 策略：最多保留 maxBackupCount 个备份，或总大小不超过 maxBackupTotalSize
 */
export function cleanupOldBackups(
  mainFilePath: string,
  config: JsonlRotationConfig = {}
): void {
  const {
    maxBackupCount = MAX_BACKUP_COUNT,
    maxBackupTotalSize = MAX_BACKUP_TOTAL_SIZE,
  } = config;

  try {
    const dataDir = path.dirname(mainFilePath);
    const baseName = path.basename(mainFilePath);
    const backupPattern = `${baseName}.backup-*`;
    
    // 获取所有备份文件
    const files = fs.readdirSync(dataDir);
    const backupFiles = files
      .filter(file => file.startsWith(`${baseName}.backup-`))
      .map(file => ({
        name: file,
        path: path.join(dataDir, file),
        stats: fs.statSync(path.join(dataDir, file))
      }))
      .sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs); // 按修改时间倒序（最新的在前）
    
    if (backupFiles.length <= maxBackupCount) {
      // 检查总大小限制
      const totalSize = backupFiles.reduce((sum, file) => sum + file.stats.size, 0);
      if (totalSize <= maxBackupTotalSize) {
        return; // 无需清理
      }
    }
    
    // 需要清理：保留最新的 maxBackupCount 个文件
    const filesToKeep = backupFiles.slice(0, maxBackupCount);
    const filesToDelete = backupFiles.slice(maxBackupCount);
    
    // 如果保留的文件总大小仍然超过限制，继续删除最旧的文件
    let currentTotalSize = filesToKeep.reduce((sum, file) => sum + file.stats.size, 0);
    let index = filesToKeep.length - 1;
    
    while (currentTotalSize > maxBackupTotalSize && index >= 0) {
      const fileToRemove = filesToKeep[index];
      filesToDelete.unshift(fileToRemove); // 添加到删除列表
      currentTotalSize -= fileToRemove.stats.size;
      index--;
    }
    
    // 实际保留的文件
    const finalFilesToKeep = filesToKeep.slice(0, index + 1);
    
    // 删除旧备份文件
    for (const file of filesToDelete) {
      try {
        fs.unlinkSync(file.path);
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[JsonlPersistence] Deleted old backup: ${file.name}`);
        }
      } catch (deleteError) {
        const errorMessage = deleteError instanceof Error ? deleteError.message : String(deleteError);
        console.error(`[JsonlPersistence] Failed to delete backup ${file.name}: ${errorMessage}`);
        // 继续尝试删除其他文件
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[JsonlPersistence] Backup cleanup: kept ${finalFilesToKeep.length}, deleted ${filesToDelete.length}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[JsonlPersistence] Backup cleanup failed: ${errorMessage}`);
    // 静默失败，不影响主流程
  }
}

/**
 * 追加记录到 JSONL 文件
 */
export function appendJsonlRecord<T extends Record<string, unknown>>(
  filePath: string,
  record: T,
  config: JsonlRotationConfig = {}
): void {
  try {
    // 确保目录存在
    const dataDir = path.dirname(filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // 检查并执行轮转
    rotateJsonlFileIfNeeded(filePath, config);
    
    // 总是检查并清理旧备份（即使没有轮转）
    cleanupOldBackups(filePath, config);
    
    const line = JSON.stringify(record) + '\n';
    
    // 追加写入文件
    fs.appendFileSync(filePath, line, { encoding: 'utf8' });

    // 可选：记录成功（仅开发调试）
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[JsonlPersistence] Record appended to ${filePath}`);
    }
  } catch (error) {
    // 静默失败，不影响主流程
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[JsonlPersistence] Failed to append record: ${errorMessage}`);
  }
}