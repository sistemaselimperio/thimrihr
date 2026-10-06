import { docBlocks, tableColumnWeights } from "@/lib/documents";

interface Props {
  text: string;
}

/** Texto del documento con las tablas "| a | b |" dibujadas como tabla. */
export function DocumentText({ text }: Props) {
  return (
    <div className="font-sans text-sm leading-relaxed">
      {docBlocks(text).map((b, idx) => {
        if (b.type === "text") {
          return (
            <pre key={idx} className="font-sans whitespace-pre-wrap">
              {b.text}
            </pre>
          );
        }
        const weights = tableColumnWeights(b.rows);
        const total = weights.reduce((a, w) => a + w, 0);
        return (
          <table key={idx} className="my-2 w-full table-fixed border-collapse">
            <colgroup>
              {weights.map((w, k) => (
                <col key={k} style={{ width: `${(w / total) * 100}%` }} />
              ))}
            </colgroup>
            <tbody>
              {b.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, k) => (
                    <td
                      key={k}
                      colSpan={k === row.length - 1 ? weights.length - k : 1}
                      className={`border border-foreground/60 px-2 py-1 align-top ${
                        k % 2 === 0 ? "font-semibold" : ""
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      })}
    </div>
  );
}
