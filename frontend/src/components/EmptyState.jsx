import { Link } from "react-router-dom";

function EmptyState({ icon: Icon, title, description, actionLabel, actionTo }) {
  return (
    <div className="card flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon && (
        <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4 text-indigo-300">
          <Icon size={26} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-white font-display">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-slate-400 mt-2 max-w-sm">{description}</p>
      )}
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="btn-primary mt-6 inline-flex px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export default EmptyState;
