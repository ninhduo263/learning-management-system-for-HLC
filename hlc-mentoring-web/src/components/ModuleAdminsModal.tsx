'use client';

import { useEffect, useState } from 'react';
import { Alert, App, Modal, Select, Typography } from 'antd';
import { errorMessage } from '@/lib/api';
import { learningApi, memberDirectoryApi, type DirectoryMember, type LearningModule } from '@/services/hlcApi';

/**
 * Chỉ định người giữ chức vụ "Admin module <tên module>": chỉ quản lý đúng module đó (xem tiến độ, duyệt bài,
 * gán đối tượng), không thấy và không sửa module khác. Chỉ Admin toàn cục và Trưởng ban Học tập đổi được.
 */
export default function ModuleAdminsModal({ module, onClose, onSaved }: { module: LearningModule | null; onClose: () => void; onSaved: () => void }) {
  const { message } = App.useApp();
  const [ids, setIds] = useState<string[]>([]);
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!module) return;
    let active = true;
    Promise.all([learningApi.moduleAdmins(module._id), memberDirectoryApi.list()])
      .then(([current, all]) => {
        if (!active) return;
        setIds(current.map((item) => item._id));
        setMembers(all.filter((item) => item.status === 'ACTIVE'));
      })
      .catch((error) => message.error(errorMessage(error)));
    return () => { active = false; };
  }, [module, message]);

  const save = async () => {
    if (!module) return;
    setSaving(true);
    try {
      await learningApi.saveModuleAdmins(module._id, ids);
      message.success(ids.length ? `Đã chỉ định ${ids.length} người giữ chức "Admin module ${module.name}"` : 'Đã bỏ hết admin module');
      onSaved();
      onClose();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={module ? `Admin module · ${module.name}` : ''} open={Boolean(module)} onCancel={onClose} onOk={save} confirmLoading={saving} destroyOnHidden>
      <div className="space-y-3">
        <Alert type="info" showIcon title={`Chức vụ: Admin module ${module?.name ?? ''}`} description="Người được chọn chỉ quản lý đúng module này. Bỏ ai ra thì họ mất quyền ngay; lịch sử chức vụ vẫn được giữ, thay đổi được ghi nhật ký." />
        <div>
          <Typography.Text strong>Người giữ chức vụ</Typography.Text>
          <Select mode="multiple" className="w-full" value={ids} onChange={setIds} optionFilterProp="label"
            options={members.map((item) => ({ value: item._id, label: `${item.memberCode} – ${item.fullName}` }))} />
        </div>
      </div>
    </Modal>
  );
}
