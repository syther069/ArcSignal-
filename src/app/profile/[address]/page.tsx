import ProfileClient from '../ProfileClient';

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  return <ProfileClient walletAddress={address} isPublic={true} />;
}
