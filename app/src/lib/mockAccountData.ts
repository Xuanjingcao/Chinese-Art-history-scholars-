/**
 * Mock Account Data - Phase 1
 * Simulates user account data for the "My Account" page.
 * All data includes userId for future CloudBase integration.
 *
 * CloudBase Collections Design (userId = _openid from CloudBase):
 * ================================================================
 * users:         { _id, _openid (CloudBase auto), username, nickname, passwordHash, email?, avatar?, createdAt }
 *                  EXISTING collection — do NOT create new. _openid is the primary user ID.
 * bookmarks:     { _id, userId = _openid (indexed), username, type, targetId, targetName, targetDetail?, createdAt }
 * browsing_history: { _id, userId = _openid (indexed), username, professorId, professorName, university, title, specialties[], viewedAt }
 * notes:         { _id, userId = _openid (indexed), username, professorId, professorName, content, createdAt, updatedAt }
 * submissions:   { _id, userId = _openid (indexed), username, type, title, description, status, adminReply?, createdAt }
 */

export interface MockUser {
  userId: string;
  username: string;
  nickname: string;
  email: string;
  avatar: string;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  type: 'professor' | 'university' | 'specialty';
  targetId: string;
  targetName: string;
  targetDetail?: string;
  createdAt: string;
}

export interface BrowsingRecord {
  id: string;
  userId: string;
  professorId: string;
  professorName: string;
  university: string;
  title: string;
  specialties: string[];
  viewedAt: string;
}

export interface Submission {
  id: string;
  userId: string;
  type: 'new_professor' | 'correction' | 'supplement';
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  adminReply?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  professorId: string;
  professorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Mock Data ──────────────────────────────────────────────

export const mockUser: MockUser = {
  userId: 'u_001',
  username: 'demo_user',
  nickname: '文房客',
  email: 'wenfang@example.com',
  avatar: '',
  createdAt: '2025-12-01T10:00:00Z',
};

export const mockBookmarks: Bookmark[] = [
  { id: 'bk_001', userId: 'u_001', type: 'professor', targetId: 'p001', targetName: '曹意强', targetDetail: '中国美术学院', createdAt: '2026-04-10T08:30:00Z' },
  { id: 'bk_002', userId: 'u_001', type: 'professor', targetId: 'us001', targetName: '巫鸿', targetDetail: '芝加哥大学', createdAt: '2026-04-12T14:20:00Z' },
  { id: 'bk_003', userId: 'u_001', type: 'university', targetId: 'uni_caa', targetName: '中国美术学院', createdAt: '2026-04-15T09:00:00Z' },
  { id: 'bk_004', userId: 'u_001', type: 'specialty', targetId: 'sp_buddhist', targetName: '佛教美术', createdAt: '2026-04-18T16:45:00Z' },
  { id: 'bk_005', userId: 'u_001', type: 'professor', targetId: 'p015', targetName: '郑岩', targetDetail: '北京大学', createdAt: '2026-05-01T11:10:00Z' },
];

export const mockBrowsingHistory: BrowsingRecord[] = [
  { id: 'bh_001', userId: 'u_001', professorId: 'p001', professorName: '曹意强', university: '中国美术学院', title: '教授', specialties: ['中国美术史', '艺术史学史'], viewedAt: '2026-05-10T09:30:00Z' },
  { id: 'bh_002', userId: 'u_001', professorId: 'us001', professorName: '巫鸿', university: '芝加哥大学', title: '教授', specialties: ['中国古代艺术与建筑', '纪念碑性'], viewedAt: '2026-05-10T10:15:00Z' },
  { id: 'bh_003', userId: 'u_001', professorId: 'p015', professorName: '郑岩', university: '北京大学', title: '教授', specialties: ['汉唐美术史', '墓葬艺术'], viewedAt: '2026-05-09T16:00:00Z' },
  { id: 'bh_004', userId: 'u_001', professorId: 'jp001', professorName: '板仓圣哲', university: '东京大学', title: '教授', specialties: ['中国绘画史', '日本美术'], viewedAt: '2026-05-08T14:30:00Z' },
  { id: 'bh_005', userId: 'u_001', professorId: 'eu001', professorName: '柯律格', university: '牛津大学', title: '教授', specialties: ['中国艺术史', '明代艺术'], viewedAt: '2026-05-07T11:20:00Z' },
  { id: 'bh_006', userId: 'u_001', professorId: 'p008', professorName: '白谦慎', university: '浙江大学', title: '教授', specialties: ['中国书法史', '晚清文化史'], viewedAt: '2026-05-06T09:00:00Z' },
];

export const mockSubmissions: Submission[] = [
  { id: 'sb_001', userId: 'u_001', type: 'new_professor', title: '新增学者：李军（中央美术学院）', description: '建议添加中央美术学院人文学院院长李军教授。', status: 'approved', adminReply: '已采纳，感谢贡献！', createdAt: '2026-03-15T10:00:00Z' },
  { id: 'sb_002', userId: 'u_001', type: 'correction', title: '更正：郑岩教授研究方向', description: '郑岩教授的最新研究方向已扩展至丝绸之路艺术。', status: 'pending', createdAt: '2026-04-20T14:30:00Z' },
  { id: 'sb_003', userId: 'u_001', type: 'supplement', title: '补充：巫鸿教授著作信息', description: '建议补充《美术史十议》2024年新版出版信息。', status: 'rejected', adminReply: '该书目信息正在统一整理中，暂不接受单独补充。', createdAt: '2026-04-25T09:15:00Z' },
  { id: 'sb_004', userId: 'u_001', type: 'new_professor', title: '新增学者：邓菲（复旦大学）', description: '复旦大学文史研究院研究员，专注宋元美术考古。', status: 'pending', createdAt: '2026-05-08T11:00:00Z' },
];

export const mockNotes: Note[] = [
  { id: 'nt_001', userId: 'u_001', professorId: 'p001', professorName: '曹意强', content: '重点关注其关于中国美术史写作方法论的研究。计划引用《艺术与历史》一书。', createdAt: '2026-04-10T08:35:00Z', updatedAt: '2026-04-15T10:20:00Z' },
  { id: 'nt_002', userId: 'u_001', professorId: 'us001', professorName: '巫鸿', content: '《武梁祠》是研究汉代画像石的经典之作，需要仔细阅读第三章关于空间再现的论述。', createdAt: '2026-04-12T14:25:00Z', updatedAt: '2026-04-12T14:25:00Z' },
];
