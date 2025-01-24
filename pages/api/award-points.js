import { Orbis } from '@orbisclub/orbis-sdk';

const orbis = new Orbis();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { did, points } = req.body;

  try {
    // Fetch the user's current profile
    const { data: profile } = await orbis.getProfile(did);

    // Update the profile with the new points
    const updatedProfile = {
      ...profile,
      points: (profile.points || 0) + points,
    };

    // Save the updated profile
    const result = await orbis.updateProfile(updatedProfile);

    if (result.status === 200) {
      res.status(200).json({ success: true });
    } else {
      throw new Error('Failed to update profile');
    }
  } catch (error) {
    console.error('Error awarding points:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}