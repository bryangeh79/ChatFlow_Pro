import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';
import type { UnifiedInboundMessage } from '../../../shared/types/unified-inbound-message';
import * as fs from 'fs';
import * as path from 'path';
import { scheduleLeadCaptureNotify } from './notify-outbound';
import type { CapturedLeadRecord } from './captured-lead-record';

export type { CapturedLeadRecord } from './captured-lead-record';

// 备份清理配置
const MAX_BACKUP_COUNT = 5; // 最多保留 5 个备份文件
const MAX_BACKUP_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB 总大小限制

// 配置常量
const JSONL_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const JSONL_MAX_LINES = 10000; // 最大行数

/**
 * 检查并执行 JSONL 文件轮转
 */
function rotateJsonlFileIfNeeded(filePath: string): void {
  try {
    if (!fs.existsSync(filePath)) {
      return;
    }

    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // 检查文件大小
    if (fileSize >= JSONL_MAX_SIZE_BYTES) {
      performRotation(filePath, 'size', fileSize);
      return;
    }

    // 检查行数（如果文件不是特别大）
    if (fileSize > 0 && fileSize < 1024 * 1024) { // 小于 1MB 时检查行数
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      if (lines.length >= JSONL_MAX_LINES) {
        performRotation(filePath, 'lines', lines.length);
      }
    }
  } catch (error) {
    // 静默失败，不影响主流程
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[LeadCapture] Rotation check failed: ${errorMessage}`);
  }
}

/**
 * 执行文件轮转
 */
function performRotation(filePath: string, reason: 'size' | 'lines', metric: number): void {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup-${timestamp}`;
    
    fs.renameSync(filePath, backupPath);
    
    // 创建新的空文件
    fs.writeFileSync(filePath, '', { encoding: 'utf8' });
    
    // 执行备份清理
    cleanupOldBackups(filePath);
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[LeadCapture] File rotated: ${reason}=${metric}, backup=${backupPath}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[LeadCapture] Rotation failed: ${errorMessage}`);
    // 不抛出，主流程继续
  }
}

/**
 * 清理旧的备份文件
 * 策略：最多保留 MAX_BACKUP_COUNT 个备份，或总大小不超过 MAX_BACKUP_TOTAL_SIZE
 */
function cleanupOldBackups(mainFilePath: string): void {
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
    
    if (backupFiles.length <= MAX_BACKUP_COUNT) {
      // 检查总大小限制
      const totalSize = backupFiles.reduce((sum, file) => sum + file.stats.size, 0);
      if (totalSize <= MAX_BACKUP_TOTAL_SIZE) {
        return; // 无需清理
      }
    }
    
    // 需要清理：保留最新的 MAX_BACKUP_COUNT 个文件
    const filesToKeep = backupFiles.slice(0, MAX_BACKUP_COUNT);
    const filesToDelete = backupFiles.slice(MAX_BACKUP_COUNT);
    
    // 如果保留的文件总大小仍然超过限制，继续删除最旧的文件
    let currentTotalSize = filesToKeep.reduce((sum, file) => sum + file.stats.size, 0);
    let index = filesToKeep.length - 1;
    
    while (currentTotalSize > MAX_BACKUP_TOTAL_SIZE && index >= 0) {
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
          console.debug(`[LeadCapture] Deleted old backup: ${file.name}`);
        }
      } catch (deleteError) {
        const errorMessage = deleteError instanceof Error ? deleteError.message : String(deleteError);
        console.error(`[LeadCapture] Failed to delete backup ${file.name}: ${errorMessage}`);
        // 继续尝试删除其他文件
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[LeadCapture] Backup cleanup: kept ${finalFilesToKeep.length}, deleted ${filesToDelete.length}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[LeadCapture] Backup cleanup failed: ${errorMessage}`);
    // 静默失败，不影响主流程
  }
}

/**
 * 追加 captured lead 记录到 JSONL 文件
 * 失败时静默处理，不影响主流程
 */
export function appendCapturedLeadRecord(
  session: UnifiedSessionContext,
  message: UnifiedInboundMessage,
): void {
  try {
    // 确保 data 目录存在
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const filePath = path.join(dataDir, 'local-captured-leads.jsonl');
    
    // 检查并执行轮转
    rotateJsonlFileIfNeeded(filePath);
    
    // 总是检查并清理旧备份（即使没有轮转）
    cleanupOldBackups(filePath);
    
    const record: CapturedLeadRecord = {
      session_id: session.session_id,
      channel: session.channel,
      collected_fields: session.lead_capture_state.collected_fields || {},
      completed_at: session.lead_capture_state.completed_at || new Date().toISOString(),
      message_id: message.message_id,
      captured_at: new Date().toISOString(),
    };

    const line = JSON.stringify(record) + '\n';
    
    // 追加写入文件
    fs.appendFileSync(filePath, line, { encoding: 'utf8' });

    scheduleLeadCaptureNotify(record);

    // 可选：记录成功（仅开发调试）
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[LeadCapture] Record appended: ${session.session_id}`);
    }
  } catch (error) {
    // 静默失败，不影响 webhook 响应
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[LeadCapture] Failed to append record: ${errorMessage}`);
  }
}