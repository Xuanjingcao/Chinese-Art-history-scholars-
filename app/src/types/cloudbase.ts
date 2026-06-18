/**
 * CloudBase Collection Schema Definitions
 *
 * PRIMARY DESIGN: userId = CloudBase _openid
 *
 * The EXISTING 'users' collection has _openid from CloudBase anonymous/wechat login.
 * We map _openid as userId. All user-related collections store userId (=_openid).
 * username is stored as an auxiliary/display field only.
 *
 * Collections:
 *   - users           (EXISTING — has _openid from CloudBase auth)
 *   - bookmarks       (NEW)
 *   - browsing_history (NEW)
 *   - notes           (NEW)
 *   - submissions     (NEW)
 *   - comment_votes   (existing)
 *   - comments        (existing)
 *   - notifications   (existing)
 *   - ratings         (existing)
 */

// ─── bookmarks ──────────────────────────────────────────────

export interface CB_Bookmark {
  _id?: string;
  userId: string;           // = _openid from CloudBase (PRIMARY, indexed)
  username: string;         // display name, auxiliary only
  type: 'professor' | 'university' | 'specialty';
  targetId: string;
  targetName: string;
  targetDetail?: string;
  createdAt: string;        // ISO 8601
}

// ─── browsing_history ───────────────────────────────────────

export interface CB_BrowsingRecord {
  _id?: string;
  userId: string;           // = _openid from CloudBase (PRIMARY, indexed)
  username: string;         // display name, auxiliary only
  professorId: string;
  professorName: string;
  university: string;
  title: string;
  specialties: string[];
  viewedAt: string;         // ISO 8601
}

// ─── notes ──────────────────────────────────────────────────

export interface CB_Note {
  _id?: string;
  userId: string;           // = _openid from CloudBase (PRIMARY, indexed)
  username: string;         // display name, auxiliary only
  professorId: string;
  professorName: string;
  content: string;
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
}

// ─── submissions ────────────────────────────────────────────

export interface CB_Submission {
  _id?: string;
  userId: string;           // = _openid from CloudBase (PRIMARY, indexed)
  username: string;         // display name, auxiliary only
  type: 'new_professor' | 'new_university' | 'website' | 'correction' | 'supplement';
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  adminReply?: string;
  createdAt: string;        // ISO 8601
}

// ─── comment_votes ──────────────────────────────────────────

export interface CB_CommentVote {
  _id?: string;
  commentId: string;        // references comments._id (indexed)
  userId: string;           // = _openid from CloudBase (PRIMARY, indexed)
  username: string;         // display name, auxiliary only
  voteType: 'like' | 'dislike';
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
}

// ─── comments ───────────────────────────────────────────────

export interface CB_Comment {
  _id?: string;
  professorId: string;      // indexed
  name: string;
  content: string;
  isAnonymous: boolean;
  replyTo: string;
  replyToName: string;
  parentId: string;
  ownerUsername: string;    // legacy: stores username
  ownerUserId: string;      // = _openid (new)
  likes: number;
  dislikes: number;
  featured: boolean;
  createdAt: string;        // ISO 8601
}

// ─── notifications ──────────────────────────────────────────

export interface CB_Notification {
  _id?: string;
  toUserId: string;         // = _openid from CloudBase (recipient, indexed)
  toUserName: string;       // display name
  fromUserId: string;       // = _openid from CloudBase (sender)
  fromUserName: string;     // sender display name
  commentId: string;
  profId: string;
  profName: string;
  content: string;
  read: boolean;
  createdAt: string;        // ISO 8601
}

// ─── ratings ────────────────────────────────────────────────

export interface CB_Rating {
  _id?: string;
  professorId: string;      // indexed
  userId: string;           // = _openid from CloudBase (who rated, indexed)
  score: number;            // 1-5
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
}

// ─── community ─────────────────────────────────────────────

export interface CB_CommunityImage {
  id: string;
  source: string;
  fileId?: string;
  width: number;
  height: number;
}

export interface CB_CommunityPost {
  _id?: string;
  userId: string;
  nickname: string;
  status: 'draft' | 'published' | 'deleted';
  title: string;
  body: string;
  topic: '读书笔记' | '展览现场' | '求学经验' | '研究方法' | '学者与院校' | '';
  images: CB_CommunityImage[];
  coverImageId: string;
  relatedProfessorId?: string;
  relatedUniversity?: string;
  likes: number;
  comments: number;
  bookmarks: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface CB_CommunityComment {
  _id?: string;
  postId: string;
  userId: string;
  nickname: string;
  content: string;
  createdAt: string;
}

export interface CB_CommunityReaction {
  _id?: string;
  userId: string;
  postId: string;
  reactionType: 'like' | 'bookmark';
  createdAt: string;
}

// ─── users (EXISTING — managed by CloudBase auth) ───────────

export interface CB_User {
  _id?: string;
  _openid: string;          // CloudBase auto-generated (PRIMARY, unique)
  username: string;         // login name chosen by user (unique)
  nickname: string;
  passwordHash: string;
  email?: string;
  avatar?: string;
  createdAt: string;        // ISO 8601
}
