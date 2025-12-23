import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Avatar, Space as _Space, Tooltip as _Tooltip, Dropdown as _Dropdown, Menu as _Menu } from 'antd';
import { UsergroupAddOutlined } from '@ant-design/icons';
import ChatBox from '../components/Chat/ChatBox';
import { teamsService } from '../services/firebaseTeams';
import { db } from '../services/firebase';
import { ref, get } from 'firebase/database';
import type { Team } from '../store/slices/teamsSlice';
import type { Message as _Message } from '../store/slices/chatSlice';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

const { Title, Text } = Typography;

export default function TeamChat() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  const [team, setTeam] = useState<Team | null>(null);
  const [membersInfo, setMembersInfo] = useState<any[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [canPost, setCanPost] = useState(false);

  useEffect(() => {
    if (!teamId) {
      // Nothing to do if no teamId
    }
  }, [teamId]);

  useEffect(() => {
    if (!teamId) return;

    const loadTeam = async () => {
      try {
        const t = await teamsService.getTeamById(teamId);
        setTeam(t);

        // gather member UIDs: coachId, userId, and any members map
        const members: string[] = [];
        if (t?.coachId) members.push(t.coachId);
        if (t?.userId) members.push(t.userId);

        // fetch team.members if present
        const teamSnapshot = await get(ref(db, `teams/${teamId}`));
        if (teamSnapshot.exists()) {
          const teamData = teamSnapshot.val() || {};
          const membersMap = teamData.members || {};
          Object.keys(membersMap).forEach((uid) => {
            if (!members.includes(uid)) members.push(uid);
          });
        }

        // fetch user info for these members
        const usersSnapshot = await get(ref(db, 'users'));
        const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};
        const infos = members.map(uid => ({ uid, ...(usersData[uid] || {}) }));
        setMembersInfo(infos);

        // count online (assume users have `online` boolean or `lastActive`)
        const online = infos.filter(i => i.online || false).length;
        setOnlineCount(online);

        // determine posting permission: owner, coach, member, or admin/owner role
        const isMember = infos.some(i => i.uid === user?.uid) || t?.userId === user?.uid || t?.coachId === user?.uid;
        // also allow admin/owner
        const isAdmin = (usersData[user?.uid || '']?.role === 'admin' || usersData[user?.uid || '']?.role === 'owner');
        setCanPost(Boolean(isMember || isAdmin));
      } catch (err) {
        console.error('Failed to load team info:', err);
      }
    };

    loadTeam();
  }, [teamId, user?.uid]);

  return (
    <div className="page-container">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar size={48} icon={<UsergroupAddOutlined />} />
          <div>
            <Title level={2} style={{ margin: 0 }}>{team?.name || `Team ${teamId}`}</Title>
            <Text type="secondary">{onlineCount} online • {membersInfo.length} members</Text>
          </div>
        </div>
        <div>
          <Button onClick={() => navigate('/admin/teams')}>Back to Teams</Button>
        </div>
      </div>

      <Card>
        <ChatBox teamId={teamId} canPost={canPost} />
      </Card>
    </div>
  );
}
