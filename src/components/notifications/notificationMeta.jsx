import {
  CheckSquare,
  Clock,
  RefreshCw,
  AtSign,
  Bot,
  Phone,
  BookOpen,
  CreditCard,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

export const NOTIF_TYPE_META = {
  task_assigned: {
    icon: CheckSquare,
    color: "text-blue-600",
    bg: "bg-blue-100",
    label: "Task Assigned",
  },
  deadline_approaching: {
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-100",
    label: "Deadline",
  },
  status_change: {
    icon: RefreshCw,
    color: "text-purple-600",
    bg: "bg-purple-100",
    label: "Status Change",
  },
  mention: {
    icon: AtSign,
    color: "text-pink-600",
    bg: "bg-pink-100",
    label: "Mention",
  },
  agent_update: {
    icon: Bot,
    color: "text-indigo-600",
    bg: "bg-indigo-100",
    label: "Agent Update",
  },
  call_summary: {
    icon: Phone,
    color: "text-green-600",
    bg: "bg-green-100",
    label: "Call Summary",
  },
  knowledge_update: {
    icon: BookOpen,
    color: "text-teal-600",
    bg: "bg-teal-100",
    label: "Knowledge Update",
  },
  billing_alert: {
    icon: CreditCard,
    color: "text-orange-600",
    bg: "bg-orange-100",
    label: "Billing Alert",
  },
  system_alert: {
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-100",
    label: "System Alert",
  },
  new_message: {
    icon: MessageSquare,
    color: "text-sky-600",
    bg: "bg-sky-100",
    label: "New Message",
  },
};

export const NOTIF_TYPE_KEYS = Object.keys(NOTIF_TYPE_META);