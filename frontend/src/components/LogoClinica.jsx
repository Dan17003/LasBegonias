export default function LogoClinica({ className = "h-24 w-24" }) {
  return (
    <img
      src="/logo-las-begonias.svg"
      alt="Logotipo de Clínica de Especialidades Odontológicas Las Begonias"
      className={`object-contain ${className}`}
    />
  );
}