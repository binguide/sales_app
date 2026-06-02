import { useState, useEffect } from "react";
import { api } from "../api";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/index.jsx";
import { Pencil, Trash2, Power, PowerOff } from "lucide-react";

export default function Users() {
  const { t } = useI18n();
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ username: "", password: "", name: "", name_en: "", role: "cashier" });

  const load = () => api.getUsers().then(setUsers);
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ username: "", password: "", name: "", name_en: "", role: "cashier" });
    setEditing("new");
  };
  const openEdit = (u) => {
    setForm({ username: u.username, password: "", name: u.name, name_en: u.name_en || "", role: u.role });
    setEditing(u.id);
  };
  const save = async () => {
    if (editing === "new") {
      await api.addUser(form);
    } else {
      await api.updateUser(editing, form);
    }
    setEditing(null);
    load();
  };
  const remove = async (id) => {
    if (!confirm(t("users.deleteConfirm"))) return;
    await api.deleteUser(id);
    load();
  };
  const toggleActive = async (u) => {
    await api.updateUser(u.id, { ...u, is_active: u.is_active ? 0 : 1 });
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t("users.title")}</h1>
        <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded">{t("users.add")}</button>
      </div>
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-start p-3">{t("users.username")}</th>
              <th className="text-start p-3">{t("users.name")}</th>
              <th className="text-start p-3">{t("users.nameEn")}</th>
              <th className="text-start p-3">{t("users.role")}</th>
              <th className="text-start p-3">{t("common.status")}</th>
              <th className="text-start p-3">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{u.username}</td>
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.name_en}</td>
                <td className="p-3">{t(`users.${u.role}`)}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${u.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {u.is_active ? t("users.active") : t("users.inactive")}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title={t("common.edit")}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => toggleActive(u)} className={`p-1.5 rounded hover:bg-yellow-50 ${u.is_active ? "text-yellow-600" : "text-green-600"}`} title={u.is_active ? t("users.deactivate") : t("users.activate")}>
                      {u.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </button>
                    <button onClick={() => remove(u.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title={t("users.delete")}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={editing !== null} onOpenChange={() => setEditing(null)}>
        <DialogTitle>{editing === "new" ? t("users.add") : t("users.edit")}</DialogTitle>
        <div className="space-y-3">
          <input className="w-full border p-2 rounded" placeholder={t("users.username")} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input className="w-full border p-2 rounded" type="password" placeholder={editing === "new" ? t("users.password") : t("users.passwordPlaceholder")} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <input className="w-full border p-2 rounded" placeholder={t("users.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="w-full border p-2 rounded" placeholder={t("users.nameEn")} value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
          <select className="w-full border p-2 rounded" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="admin">{t("users.admin")}</option>
            <option value="cashier">{t("users.cashier")}</option>
            <option value="manager">{t("users.manager")}</option>
          </select>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(null)} className="px-4 py-2 border rounded">{t("common.cancel")}</button>
            <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded">{t("common.save")}</button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
