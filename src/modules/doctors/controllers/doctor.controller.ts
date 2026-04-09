import { Request, Response } from 'express';
import * as doctorsService from '../services/doctor.service';
import { asyncHandler } from '../../../common/utils/asyncHandler';

interface AuthRequest extends Request {
  user: {
    id: number;
    role: string;
  };
}

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const doctor = await doctorsService.getMyProfile(authReq.user.id);

  res.status(200).json({
    status: 'success',
    data: doctor,
  });
});

export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const updated = await doctorsService.updateMyProfile(authReq.user.id, req.body);

  res.status(200).json({
    status: 'success',
    data: updated,
  });
});

export const getAllDoctors = asyncHandler(
  async (_req: Request, res: Response) => {
    const doctors = await doctorsService.getAllDoctors();

    res.status(200).json({
      status: 'success',
      results: doctors.length,
      data: doctors,
    });
  },
);
