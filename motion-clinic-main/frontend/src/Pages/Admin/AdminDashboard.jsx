import React from 'react';
import AdminDashboardComponent from '../../components/admin/AdminDashboard';
import { useTranslation } from 'react-i18next';

const AdminDashboard = () => {
  const { t } = useTranslation();

  return (
    <div className="admin-page">
      <AdminDashboardComponent />
    </div>
  );
};

export default AdminDashboard; 