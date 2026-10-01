import { Button } from 'antd';

interface ProfileLinkProps {
  url?: string;
}

export default function ProfileLink({ url }: ProfileLinkProps) {
  const profileUrl = String(url || '').trim();
  if (!/^https?:\/\//i.test(profileUrl)) return '—';

  return (
    <Button type="link" href={profileUrl} target="_blank" rel="noreferrer" className="!px-0">
      Xem profile
    </Button>
  );
}
