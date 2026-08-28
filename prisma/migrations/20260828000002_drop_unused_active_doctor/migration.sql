-- AlterTable
-- Reverts activeDoctorId from the previous migration: invitation-service.ts blocks a user
-- from ever holding a second Membership ("already-member-elsewhere"), so there is currently
-- no way for more than one clinic to exist per user — an active-clinic selector would have
-- nothing to select between. Revisit if that one-clinic-per-user policy is relaxed.
ALTER TABLE "User" DROP COLUMN "activeDoctorId";
