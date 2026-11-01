"use client";

import {
  ArrowRightOutlined,
  CheckCircleFilled,
  FireFilled,
  RocketFilled,
  TeamOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const openMentoring = () => {
    const savedUser = localStorage.getItem("hlc_user");
    if (!savedUser) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(savedUser) as { role?: string };
      const route = user.role === "ADMIN"
        ? "/admin-dashboard"
        : user.role === "MENTOR"
          ? "/mentor-dashboard"
          : "/mentee-dashboard";
      router.push(route);
    } catch {
      router.replace("/login");
    }
  };

  return (
    <div className="dashboard-shell">
      <section className="welcome-card">
        <div className="welcome-copy">
          <span className="eyebrow"><RocketFilled /> HLC MENTORING</span>
          <h1>Kết nối để <span>cùng tiến xa.</span></h1>
          <p>
            Không gian mentoring của HLC giúp bạn theo dõi lịch hẹn, kết nối
            cùng mentor và ghi lại những điều học được sau mỗi buổi gặp.
          </p>
          <button className="primary-action" type="button" onClick={openMentoring}>
            Vào hệ thống <ArrowRightOutlined />
          </button>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="orbit-card">
            <FireFilled />
            <strong>7 ngày</strong>
            <small>duy trì liên tục</small>
          </div>
          <div className="floating-check"><CheckCircleFilled /></div>
        </div>
      </section>
      <section className="mentoring-intro">
        <div className="intro-icon"><TeamOutlined /></div>
        <div>
          <span className="section-kicker">MỘT KHÔNG GIAN TẬP TRUNG</span>
          <h2>Mentoring, học tập, HLC Fund và điểm phụ cấp</h2>
          <p>Theo dõi lịch mentoring và recap, nộp bài học tập, gửi minh chứng HLC Fund và xem điểm phụ cấp hằng tháng.</p>
        </div>
      </section>
    </div>
  );
}