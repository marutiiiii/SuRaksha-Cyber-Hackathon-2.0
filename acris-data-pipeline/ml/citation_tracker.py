def attach_citations(maps, metadata, regulation):
    reg_title = metadata.get("title") or regulation.get("pdf_name", "Unknown Regulation")
    authority = metadata.get("issuing_authority") or regulation.get("source", "Unknown Authority")
    circular_no = metadata.get("circular_number", "N/A")
    pub_date = metadata.get("publication_date", "N/A")
    eff_date = metadata.get("effective_date", "N/A")

    for m in maps:
        clause_text = m.get("source_clause_text", "")
        preview = (clause_text[:150] + "…") if len(clause_text) > 150 else clause_text

        m["citation"] = {
            "regulation_title": reg_title,
            "issuing_authority": authority,
            "circular_number": circular_no,
            "publication_date": pub_date,
            "effective_date": eff_date,
            "clause_id": m.get("source_clause_id", "N/A"),
            "clause_heading": m.get("source_clause_heading", ""),
            "source_text_preview": preview,
        }

    return maps
