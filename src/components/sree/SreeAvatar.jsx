export default function SreeAvatar({ src, alt = "Sree", className = "w-8 h-8 rounded-full object-cover" }) {
  const fallback =
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/1e23c85b7_Gemini_Generated_Image_4njbwr4njbwr4njb.jpg";
  return (
    <img src={src || fallback} alt={alt} className={className} onError={(e) => { e.currentTarget.src = fallback; }} />
  );
}