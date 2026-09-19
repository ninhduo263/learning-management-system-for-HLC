'use client';
import { useEffect, useState } from 'react';
import { Table, Tag, Button, App, Image, Space } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import moment from 'moment';
import { apiFetch } from '@/lib/api';

export default function AdminFundPage() {
  const { message } = App.useApp();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Hàm gọi API lấy danh sách dữ liệu
  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/submissions/fund');
      const result = await res.json();
      if (result.success) {
        setSubmissions(result.data);
      }
    } catch (error) {
      message.error('Không thể tải dữ liệu từ server!');
    }
    setLoading(false);
  };

  // Chạy hàm fetchSubmissions ngay khi mở trang
  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Hàm gọi API cập nhật trạng thái
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await apiFetch(`/submissions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      const result = await res.json();
      if (result.success) {
        message.success(`Đã ${newStatus === 'APPROVED' ? 'duyệt' : 'từ chối'} minh chứng!`);
        fetchSubmissions(); // Tải lại bảng sau khi cập nhật thành công
      }
    } catch (error) {
      message.error('Lỗi khi cập nhật trạng thái');
    }
  };

  // Cấu hình các cột cho Bảng (Table)
  const columns = [
    {
      title: 'Ngày nộp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => moment(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Mã Mentee',
      dataIndex: 'userId',
      key: 'userId',
      render: (text: string) => <span className="font-semibold text-blue-600">{text}</span>,
    },
    {
      title: 'Minh chứng',
      key: 'content',
      render: (record: any) => (
        // AntD Image hỗ trợ tự động click để phóng to (Zoom)
        <Image 
          width={60} 
          height={60}
          src={record.content?.imageUrls[0]} 
          className="object-cover rounded border"
          alt="Minh chứng"
        />
      )
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = status === 'APPROVED' ? 'green' : status === 'REJECTED' ? 'red' : 'gold';
        let text = status === 'APPROVED' ? 'Đã duyệt' : status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt';
        return <Tag color={color}>{text.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (record: any) => (
        <Space size="middle">
          <Button 
            type="primary" 
            className="bg-green-500 hover:bg-green-600"
            icon={<CheckOutlined />}
            size="small"
            disabled={record.status !== 'PENDING'}
            onClick={() => handleUpdateStatus(record._id, 'APPROVED')}
          >
            Duyệt
          </Button>
          <Button 
            danger 
            type="primary"
            icon={<CloseOutlined />}
            size="small"
            disabled={record.status !== 'PENDING'}
            onClick={() => handleUpdateStatus(record._id, 'REJECTED')}
          >
            Từ chối
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Quản lý duyệt quỹ HLC</h1>
      <Table 
        columns={columns} 
        dataSource={submissions} 
        rowKey="_id" 
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 5 }}
      />
    </div>
  );
}