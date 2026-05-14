"""Small async in-memory database for local development without MongoDB."""
from copy import deepcopy


class InsertOneResult:
    def __init__(self, inserted_id=None):
        self.inserted_id = inserted_id


class DeleteResult:
    def __init__(self, deleted_count=0):
        self.deleted_count = deleted_count


class UpdateResult:
    def __init__(self, matched_count=0, modified_count=0, upserted_id=None):
        self.matched_count = matched_count
        self.modified_count = modified_count
        self.upserted_id = upserted_id


class MemoryCursor:
    def __init__(self, docs):
        self.docs = docs

    def sort(self, key, direction=1):
        reverse = direction == -1
        self.docs.sort(key=lambda item: item.get(key) or "", reverse=reverse)
        return self

    def limit(self, count):
        self.docs = self.docs[:count]
        return self

    async def to_list(self, length):
        if length is None:
            return deepcopy(self.docs)
        return deepcopy(self.docs[:length])


class MemoryCollection:
    def __init__(self):
        self.docs = []

    async def create_index(self, *args, **kwargs):
        return None

    async def insert_one(self, doc):
        self.docs.append(deepcopy(doc))
        return InsertOneResult(doc.get("id") or doc.get("_id"))

    async def insert_many(self, docs):
        for doc in docs:
            await self.insert_one(doc)

    async def find_one(self, query=None, projection=None, sort=None):
        docs = [doc for doc in self.docs if _matches(doc, query or {})]
        if sort:
            for key, direction in reversed(sort):
                docs.sort(key=lambda item: item.get(key) or "", reverse=direction == -1)
        if not docs:
            return None
        return _project(docs[0], projection)

    def find(self, query=None, projection=None):
        docs = [_project(doc, projection) for doc in self.docs if _matches(doc, query or {})]
        return MemoryCursor(docs)

    async def count_documents(self, query):
        return sum(1 for doc in self.docs if _matches(doc, query or {}))

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if _matches(doc, query or {}):
                _apply_update(doc, update)
                return UpdateResult(1, 1)
        if upsert:
            doc = {k: v for k, v in (query or {}).items() if not k.startswith("$") and not isinstance(v, dict)}
            _apply_update(doc, update)
            self.docs.append(doc)
            return UpdateResult(0, 0, doc.get("id") or doc.get("_id"))
        return UpdateResult()

    async def update_many(self, query, update):
        matched = 0
        for doc in self.docs:
            if _matches(doc, query or {}):
                _apply_update(doc, update)
                matched += 1
        return UpdateResult(matched, matched)

    async def delete_one(self, query):
        for index, doc in enumerate(self.docs):
            if _matches(doc, query or {}):
                self.docs.pop(index)
                return DeleteResult(1)
        return DeleteResult()


class MemoryAdmin:
    async def command(self, name):
        return {"ok": 1}


class MemoryDB:
    def __init__(self):
        self._collections = {}
        self.admin = MemoryAdmin()

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self._collections.setdefault(name, MemoryCollection())


def _matches(doc, query):
    for key, expected in query.items():
        if key == "$or":
            if not any(_matches(doc, item) for item in expected):
                return False
            continue

        actual = doc.get(key)
        if isinstance(expected, dict):
            for op, value in expected.items():
                if op == "$in":
                    if actual not in value:
                        return False
                elif op == "$ne":
                    if actual == value:
                        return False
                else:
                    if actual != value:
                        return False
        elif actual != expected:
            return False
    return True


def _apply_update(doc, update):
    if not any(key.startswith("$") for key in update):
        doc.update(deepcopy(update))
        return

    for key, value in update.get("$set", {}).items():
        doc[key] = deepcopy(value)
    for key, value in update.get("$inc", {}).items():
        doc[key] = doc.get(key, 0) + value
    for key, value in update.get("$push", {}).items():
        doc.setdefault(key, []).append(deepcopy(value))
    for key, value in update.get("$pull", {}).items():
        doc[key] = [item for item in doc.get(key, []) if item != value]


def _project(doc, projection):
    result = deepcopy(doc)
    if not projection:
        return result

    include_keys = {key for key, value in projection.items() if value}
    exclude_keys = {key for key, value in projection.items() if not value}
    if include_keys:
        result = {key: deepcopy(doc[key]) for key in include_keys if key in doc}
    for key in exclude_keys:
        result.pop(key, None)
    return result
