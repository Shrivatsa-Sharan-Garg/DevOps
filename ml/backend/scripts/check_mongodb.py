import sys
from urllib.parse import urlsplit

from pymongo import MongoClient
from pymongo.errors import PyMongoError

from ..config.settings import get_settings
from ..services.seed_service import load_seed_dataset

COLLECTIONS=(
    "users",
    "problems",
    "community_reports",
    "relationships",
    "upvotes",
    "comments",
    "solutions",
    "srs_documents",
    "ai_feedback",
    "match_sessions"
)


def safe_address(uri:str)->str:
    parts=urlsplit(uri)

    return f"{parts.scheme}://{parts.hostname}:{parts.port or 27017}"


def run()->int:
    settings=get_settings()
    client=MongoClient(settings.mongodb_uri,serverSelectionTimeoutMS=settings.mongodb_timeout_ms)
    print(f"Server: {safe_address(settings.mongodb_uri)}")
    print(f"Database: {settings.mongodb_database}")

    try:
        client.admin.command("ping")
        database=client[settings.mongodb_database]

        for name in COLLECTIONS:
            print(f"  {name:18} {database[name].count_documents({})}")

        seed_ids=[problem["id"] for problem in load_seed_dataset(settings).get("problems",[])]
        present=database.problems.count_documents({"id":{"$in":seed_ids}})
        print(f"Seed problems already stored: {present} of {len(seed_ids)}")
    except PyMongoError as error:
        print(f"MongoDB is not reachable: {error}")
        return 1
    finally:
        client.close()

    return 0


if __name__ == "__main__":
    sys.exit(run())
