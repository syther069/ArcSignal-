import ProfileClient from '../ProfileClient';

export default function PublicProfilePage({ params }: { params: { address: string } }) {
  return <ProfileClient walletAddress={params.address} isPublic={true} />;
}
