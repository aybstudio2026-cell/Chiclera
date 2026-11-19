export const Stat = ({ label, value, sub }) => (
  <div className="stat"><span>{label}</span><b>{value}</b>{sub && <small>{sub}</small>}</div>
)
export const Err = ({ e }) => (e ? <p className="err">{e}</p> : null)
export const Page = ({ title, actions, children }) => (
  <section><header className="head"><h1>{title}</h1><div>{actions}</div></header>{children}</section>
)
export const Field = ({ label, ...p }) => (<label>{label}<input {...p} /></label>)
// Convierte el formulario en objeto, parseando los campos numéricos indicados
export const formData = (e, nums = []) => {
  e.preventDefault()
  const o = Object.fromEntries(new FormData(e.target))
  nums.forEach((k) => (o[k] = Number(o[k])))
  Object.keys(o).forEach((k) => { if (o[k] === '') o[k] = null })
  return o
}
