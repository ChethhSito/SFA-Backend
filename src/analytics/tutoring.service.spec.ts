import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

describe('Persisted tutoring notifications', () => {
  const query = (value: unknown) => ({ lean: () => ({ exec: async () => value }) });
  const student = { dni: '12345678', name: 'Ana', lastName: 'Perez' };
  const referral = { studentDni: student.dni, studentName: 'Ana Perez', reason: 'Seguimiento', registeredAt: new Date(), readAt: null };
  function setup() {
    const students = { findOne: jest.fn(() => query(student)) };
    const referrals = { findOneAndUpdate: jest.fn(() => query(referral)),
      findOne: jest.fn(() => query(referral)),
      find: jest.fn(() => ({ sort: jest.fn(() => query([referral])) })) };
    const service = new AnalyticsService(students as never, {} as never, {} as never, {} as never, {} as never, referrals as never);
    return { service, students, referrals };
  }

  it('persists the student, trimmed reason and timestamp before reporting success', async () => {
    const { service, referrals } = setup();
    const response = await service.referStudentToTutoring(student.dni, ' Seguimiento ');
    expect(response).toMatchObject({ success: true, referral });
    expect(referrals.findOneAndUpdate).toHaveBeenCalledWith({ studentDni: student.dni }, {
      $setOnInsert: { ...referral, registeredAt: expect.any(Date) },
    }, { upsert: true, returnDocument: 'after', runValidators: true });
  });

  it('rejects invalid DNI, empty reasons and oversized reasons without writing', async () => {
    const { service, referrals } = setup();
    for (const [dni, reason] of [['abc', 'Motivo'], [student.dni, '  '], [student.dni, 'x'.repeat(2001)]]) {
      await expect(service.referStudentToTutoring(dni, reason)).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(referrals.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects unknown students without creating notifications', async () => {
    const { service, students, referrals } = setup();
    students.findOne.mockReturnValue(query(null) as never);
    await expect(service.referStudentToTutoring(student.dni, 'Motivo')).rejects.toBeInstanceOf(NotFoundException);
    expect(referrals.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('recovers the existing record after concurrent duplicate submissions', async () => {
    const { service, referrals } = setup();
    referrals.findOneAndUpdate.mockImplementation(() => ({ lean: () => ({ exec: async () => { throw { code: 11000 }; } }) }));
    expect((await service.referStudentToTutoring(student.dni, 'Otro motivo')).referral).toEqual(referral);
  });

  it('does not return success when the database fails', async () => {
    const { service, referrals } = setup();
    referrals.findOneAndUpdate.mockImplementation(() => ({ lean: () => ({ exec: async () => { throw new Error('Database offline'); } }) }));
    await expect(service.referStudentToTutoring(student.dni, 'Motivo')).rejects.toThrow('Database offline');
  });

  it('reads persisted notifications and updates only the requested unread record', async () => {
    const { service, referrals } = setup();
    expect(await service.listTutoringReferrals()).toEqual([referral]);
    await service.markTutoringReferralRead(student.dni);
    expect(referrals.findOneAndUpdate).toHaveBeenCalledWith({ studentDni: student.dni, readAt: null },
      { $set: { readAt: expect.any(Date) } }, { returnDocument: 'after' });
  });

  it('keeps the original read date when the same notification is read twice', async () => {
    const { service, referrals } = setup();
    const read = { ...referral, readAt: new Date('2026-10-19T10:00:00Z') };
    referrals.findOne.mockReturnValue(query(read));
    expect(await service.markTutoringReferralRead(student.dni)).toEqual(read);
    expect(referrals.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('does not create a notification when marking an unknown record as read', async () => {
    const { service, referrals } = setup();
    referrals.findOne.mockReturnValue(query(null) as never);
    await expect(service.markTutoringReferralRead(student.dni)).rejects.toBeInstanceOf(NotFoundException);
    expect(referrals.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('requires a note and responsible staff member before recording case attention', async () => {
    const { service, referrals } = setup();
    await expect(service.updateTutoringCase(student.dni, { status: 'EN_ATENCION', responsible: '', note: 'Seguimiento', revision: 0 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateTutoringCase(student.dni, { status: 'EN_ATENCION', responsible: 'Tutor', note: '', revision: 0 })).rejects.toBeInstanceOf(BadRequestException);
    expect(referrals.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('does not close a pending case without recording attention first', async () => {
    const { service, referrals } = setup();
    await expect(service.updateTutoringCase(student.dni, { status: 'CERRADO', responsible: 'Tutor', note: 'Cierre', revision: 0 })).rejects.toBeInstanceOf(BadRequestException);
    expect(referrals.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('atomically appends case history and checks the current revision', async () => {
    const { service, referrals } = setup();
    await service.updateTutoringCase(student.dni, { status: 'EN_ATENCION', responsible: 'Tutor', note: 'Primera entrevista', revision: 0 });
    expect(referrals.findOneAndUpdate).toHaveBeenCalledWith({ studentDni: student.dni, $or: [{ revision: 0 }, { revision: { $exists: false } }] }, {
      $set: { status: 'EN_ATENCION', responsible: 'Tutor', closedAt: null }, $inc: { revision: 1 },
      $push: { history: { status: 'EN_ATENCION', responsible: 'Tutor', note: 'Primera entrevista', date: expect.any(Date) } },
    }, { returnDocument: 'after', runValidators: true });
  });
});
