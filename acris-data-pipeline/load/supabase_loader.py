from supabase import create_client

SUPABASE_URL = "https://bktarknlplgqkywwzaeu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGFya25scGxncWt5d3d6YWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzMyODksImV4cCI6MjA5Njg0OTI4OX0.C5iDI1rBiLF505Yt655wzGqlsKsrDurGGNEsUGCBmbE"

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


def insert_regulation(data):

    response = (
        supabase.table("regulations")
        .insert({
            "title": data["pdf_name"],
            "source": data["source"],
            "pdf_name": data["pdf_name"],
            "total_chunks": data["total_chunks"],
            "content": data["content"]
        })
        .execute()
    )

    if not response.data:
        raise Exception("Failed to insert regulation")

    return response.data[0]["id"]


def insert_chunks(regulation_id, chunks):

    rows = []

    for idx, chunk in enumerate(chunks):
        rows.append({
            "regulation_id": regulation_id,
            "chunk_index": idx + 1,
            "chunk_text": chunk
        })

    response = (
        supabase.table("regulation_chunks")
        .insert(rows)
        .execute()
    )

    return response

def regulation_exists(pdf_name):

    response = (
        supabase.table("regulations")
        .select("id")
        .eq("pdf_name", pdf_name)
        .execute()
    )

    return len(response.data) > 0
def get_all_chunks():

    response = (
        supabase.table("regulation_chunks")
        .select("*")
        .execute()
    )

    return response.data