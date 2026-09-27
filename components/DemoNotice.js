export default function DemoNotice({ demo }) {
  if (!demo) return null;
  return (
    <div className="notice">
      Demo mode — showing sample data. Connect Supabase (see README) to show the real career.
    </div>
  );
}
