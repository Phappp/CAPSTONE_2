import AppDataSource from '../../../../../lib/database';
import LiveSession from '../../../../../internal/model/live_session';
import Course from '../../../../../internal/model/course';
import User from '../../../../../internal/model/user';
import { LiveSessionService } from '../types';
import {
  CreateLiveSessionRequest,
  UpdateLiveSessionRequest,
  LiveSessionListQuery,
  LiveSessionListResult,
  LiveSessionItem
} from '../types';

const liveSessionRepo = AppDataSource.getRepository(LiveSession);
const courseRepo = AppDataSource.getRepository(Course);
const userRepo = AppDataSource.getRepository(User);

function toDto(session: LiveSession): LiveSessionItem {
  return {
    id: session.id,
    courseId: session.courseId,
    courseTitle: session.course?.title,
    title: session.title,
    description: session.description,
    hostId: session.hostId,
    hostName: session.host?.full_name || undefined,
    jitsiRoomName: session.jitsiRoomName,
    scheduledAt: session.scheduledAt ? session.scheduledAt.toISOString() : null,
    startedAt: session.startedAt ? session.startedAt.toISOString() : null,
    endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

export class LiveSessionServiceImpl implements LiveSessionService {

  async createSession(hostId: number, request: CreateLiveSessionRequest): Promise<{ id: number }> {
    const course = await courseRepo.findOne({ where: { id: request.courseId } });
    if (!course) {
      throw new Error('Khóa học không tồn tại');
    }

    // Generate unique room name: capstone_{courseId}_{timestamp}
    const jitsiRoomName = `capstone_${request.courseId}_${Date.now()}`;

    const session = liveSessionRepo.create({
      courseId: request.courseId,
      title: request.title,
      description: request.description || null,
      hostId: hostId,
      jitsiRoomName: jitsiRoomName,
      scheduledAt: request.scheduledAt ? new Date(request.scheduledAt) : null,
      status: 'scheduled',
    });

    const saved = await liveSessionRepo.save(session);
    return { id: saved.id };
  }

  async getSessionById(hostId: number, sessionId: number): Promise<LiveSessionItem> {
    const session = await liveSessionRepo.findOne({
      where: { id: sessionId },
      relations: ['course', 'host'],
    });

    if (!session) {
      throw new Error('Buổi live không tồn tại');
    }

    return toDto(session);
  }

  async listSessions(query: LiveSessionListQuery): Promise<LiveSessionListResult> {
    const page = query.page || 1;
    const pageSize = query.page_size || 20;
    const skip = (page - 1) * pageSize;

    const queryBuilder = liveSessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.course', 'course')
      .leftJoinAndSelect('session.host', 'host')
      .orderBy('session.createdAt', 'DESC');

    if (query.courseId) {
      queryBuilder.andWhere('session.courseId = :courseId', { courseId: query.courseId });
    }

    if (query.hostId) {
      queryBuilder.andWhere('session.hostId = :hostId', { hostId: query.hostId });
    }

    if (query.status) {
      queryBuilder.andWhere('session.status = :status', { status: query.status });
    }

    const [sessions, total] = await queryBuilder.skip(skip).take(pageSize).getManyAndCount();

    return {
      items: sessions.map(toDto),
      page,
      page_size: pageSize,
      total,
    };
  }

  async updateSession(hostId: number, sessionId: number, request: UpdateLiveSessionRequest): Promise<void> {
    const session = await liveSessionRepo.findOne({ where: { id: sessionId } });

    if (!session) {
      throw new Error('Buổi live không tồn tại');
    }

    if (session.hostId !== hostId) {
      throw new Error('Bạn không có quyền cập nhật buổi live này');
    }

    if (session.status === 'live') {
      throw new Error('Không thể cập nhật khi buổi live đang diễn ra');
    }

    if (session.status === 'ended') {
      throw new Error('Không thể cập nhật buổi live đã kết thúc');
    }

    if (request.title !== undefined) {
      session.title = request.title;
    }

    if (request.description !== undefined) {
      session.description = request.description;
    }

    if (request.scheduledAt !== undefined) {
      session.scheduledAt = request.scheduledAt ? new Date(request.scheduledAt) : null;
    }

    await liveSessionRepo.save(session);
  }

  async deleteSession(hostId: number, sessionId: number): Promise<void> {
    const session = await liveSessionRepo.findOne({ where: { id: sessionId } });

    if (!session) {
      throw new Error('Buổi live không tồn tại');
    }

    if (session.hostId !== hostId) {
      throw new Error('Bạn không có quyền xóa buổi live này');
    }

    if (session.status === 'live') {
      throw new Error('Không thể xóa khi buổi live đang diễn ra');
    }

    await liveSessionRepo.remove(session);
  }

  async startSession(hostId: number, sessionId: number): Promise<LiveSessionItem> {
    const session = await liveSessionRepo.findOne({
      where: { id: sessionId },
      relations: ['course', 'host'],
    });

    if (!session) {
      throw new Error('Buổi live không tồn tại');
    }

    if (session.hostId !== hostId) {
      throw new Error('Bạn không có quyền bắt đầu buổi live này');
    }

    if (session.status === 'live') {
      throw new Error('Buổi live đã được bắt đầu');
    }

    if (session.status === 'ended') {
      throw new Error('Buổi live đã kết thúc');
    }

    session.status = 'live';
    session.startedAt = new Date();
    await liveSessionRepo.save(session);

    return toDto(session);
  }

  async endSession(hostId: number, sessionId: number): Promise<LiveSessionItem> {
    const session = await liveSessionRepo.findOne({
      where: { id: sessionId },
      relations: ['course', 'host'],
    });

    if (!session) {
      throw new Error('Buổi live không tồn tại');
    }

    if (session.hostId !== hostId) {
      throw new Error('Bạn không có quyền kết thúc buổi live này');
    }

    if (session.status === 'ended') {
      throw new Error('Buổi live đã được kết thúc');
    }

    if (session.status === 'scheduled') {
      throw new Error('Buổi live chưa được bắt đầu');
    }

    session.status = 'ended';
    session.endedAt = new Date();
    await liveSessionRepo.save(session);

    return toDto(session);
  }
}
