const variants = {
  primary: "btn-primary text-white",
  ghost: "bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10",
  danger:
    "bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30",
  outline:
    "bg-transparent border border-indigo-400/40 text-indigo-300 hover:bg-indigo-500/10",
};

function Button({
  children,
  variant = "primary",
  className = "",
  loading = false,
  icon: Icon,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
      ) : (
        Icon && <Icon size={18} />
      )}
      {children}
    </button>
  );
}

export default Button;
