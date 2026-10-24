'use client';

import { useEffect, useState } from 'react';
import { Alert, App, Modal, Radio, Select, Typography } from 'antd';
import { errorMessage } from '@/lib/api';
import { GROUP_KIND_LABEL, groupApi, learningApi, memberCrudApi, type GroupView, type LearningModule, type Member } from '@/services/hlcApi';

/**
 * Gán module học tập cho MTE / MTO cụ thể (chọn từng người hoặc theo nhóm). Chỉ người được gán mới thấy và nộp bài;
 * người không được gán không bị tính thiếu bài. Thêm / bớt người bất cứ lúc nào, bài đã nộp được giữ nguyên.
 */
export default function ModuleAudienceModal({ module, onClose, onSaved }: { module: LearningModule | null; onClose: () => void; onSaved: () => void }) {
  const { message } = App.useApp();
  const [mode, setMode] = useState<'ALL' | 'SELECTED'>('ALL');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<GroupView[]>([]);
  const [count, setCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!module) return;
    let active = true;
    Promise.all([learningApi.audience(module._id), memberCrudApi.many({ status: 'ACTIVE' }, { memberCode: 1 }), groupApi.list().catch(() => [] as GroupView[])])
      .then(([audience, all, groupList]) => {
        if (!active) return;
        setMode(audience.mode);
        setMemberIds(audience.members.map((item) => item._id));
        setGroupIds(audience.groups.map((item) => item._id));
        setCount(audience.audienceCount);
        setMembers(all.filter((item) => module.targetMemberType === 'ALL' || item.memberType === module.targetMemberType));
        setGroups(groupList.filter((item) => item.isActive));
      })
      .catch((error) => message.error(errorMessage(error)));
    return () => { active = false; };
  }, [module, message]);

  const save = async () => {
    if (!module) return;
    setSaving(true);
    try {
      const result = await learningApi.saveAudience(module._id, { mode, memberIds, groupIds });
      message.success(mode === 'ALL' ? 'Module áp dụng cho mọi thành viên đúng đối tượng' : `Đã gán module cho ${result.audienceCount} người`);
      onSaved();
      onClose();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={module ? `Người được gán · ${module.name}` : ''} open={Boolean(module)} onCancel={onClose} onOk={save} confirmLoading={saving} width={640} destroyOnHidden>
      <div className="space-y-3">
        <Radio.Group value={mode} onChange={(event) => setMode(event.target.value)}>
          <Radio value="ALL">Mọi thành viên đúng đối tượng</Radio>
          <Radio value="SELECTED">Chỉ người / nhóm được chọn</Radio>
        </Radio.Group>
        {mode === 'SELECTED' && (
          <>
            <Alert type="info" showIcon title="Người không được gán hoàn toàn không thấy module và không bị tính thiếu bài trong tỷ lệ hoàn thành, điểm. Bỏ ai ra thì bài họ đã nộp vẫn được giữ." />
            <div>
              <Typography.Text strong>Theo nhóm (mọi thành viên hiện tại của nhóm)</Typography.Text>
              <Select mode="multiple" className="w-full" value={groupIds} onChange={setGroupIds} optionFilterProp="label"
                options={groups.map((item) => ({ value: item._id, label: `${item.name} (${GROUP_KIND_LABEL[item.groupKind]})` }))} />
            </div>
            <div>
              <Typography.Text strong>Từng người</Typography.Text>
              <Select mode="multiple" className="w-full" value={memberIds} onChange={setMemberIds} optionFilterProp="label"
                options={members.map((item) => ({ value: item._id, label: `${item.memberCode} – ${item.fullName}` }))} />
            </div>
          </>
        )}
        <Typography.Text type="secondary">Hiện có {count} người là đối tượng của module (lưu để cập nhật).</Typography.Text>
      </div>
    </Modal>
  );
}
