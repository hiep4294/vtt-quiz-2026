"""Extract the VTT question bank from the source PDF into an ES module.

The source PDF intentionally is not copied into the repository.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import pdfplumber


PREFIX_TO_TARGET = {
    "VTT1": "CSSPV",
    "VTT2": "KDSPV",
    "VTT3": "TTC",
    "VTT4": "DCTC",
}

COMMON_POOLS = {
    "VTT5": "KT26.VTT.TDT_chung",
    "VTT6": "KT26.VTT.QLRRHD_chung",
    "VTT7": "KT26.VTT.PC_chung",
    "VTT8": "KT26.VTT.TTTM_chung",
    "VTT9": "KT26.VTT.QLRRTD_chung",
    "VTT10": "KT26.VTT.KN_chung",
}


def clean(value: str | None) -> str:
    """Collapse PDF line wrapping while retaining readable text."""
    return re.sub(r"\s+", " ", value or "").strip()


def pool_for(question_id: str) -> str:
    prefix, number_text = question_id.split(".", 1)
    if prefix in COMMON_POOLS:
        return COMMON_POOLS[prefix]
    if prefix not in PREFIX_TO_TARGET:
        raise ValueError(f"Unknown question prefix: {prefix}")

    # The first four source banks each contain the Group 2 block (01-30)
    # followed by the common block (31+).
    suffix = "n2" if int(number_text) <= 30 else "chung"
    return f"KT26.VTT.{PREFIX_TO_TARGET[prefix]}_{suffix}"


def extract(pdf_path: Path) -> list[dict]:
    questions: list[dict] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            if len(tables) != 1:
                raise ValueError(f"Expected one table on page {page.page_number}")
            for row in tables[0][1:]:
                if not row or len(row) != 10 or not clean(row[1]):
                    continue
                question_id = clean(row[1])
                questions.append(
                    {
                        "id": question_id,
                        "pool": pool_for(question_id),
                        "question": clean(row[2]),
                        "options": {
                            "A": clean(row[3]),
                            "B": clean(row[4]),
                            "C": clean(row[5]),
                            "D": clean(row[6]),
                        },
                        "answer": clean(row[7]),
                        "difficulty": clean(row[8]),
                        "reference": clean(row[9]),
                    }
                )

    corrections = {
        "VTT4.21": {
            "question": (
                "Theo quy định về cập nhật thông tin nhận biết khách hàng, đối với khách hàng "
                "được phân loại rủi ro cao về rửa tiền, tần suất cập nhật định kỳ là như thế nào?"
            )
        },
        "VTT10.47": {
            "options": {
                "A": "Những kết luận và quyết định của bạn đa phần là đúng",
                "B": (
                    "Bạn dễ đưa ra những nhận định, kết luận và quyết định sai lầm vì bạn "
                    "không nắm chắc những yếu tố tác động"
                ),
                "C": "Khả năng thành công của bạn rất cao vì bạn có tầm nhìn",
                "D": (
                    "Khuynh hướng này thực tế không tồn tại vì khả năng phân tích và tổng hợp "
                    "của một người là bằng nhau"
                ),
            }
        },
        "VTT10.40": {
            "options": {
                "A": (
                    "Tại sao cứ mỗi lần mình đến làm việc với họ là gặp rắc rối. Tại sao họ luôn "
                    "gây khó khăn cho mình? Tại sao họ không thay đổi cách làm việc? Tại sao họ "
                    "lại có thành kiến với mình? Tại sao vấn đề không xảy ra với người khác mà "
                    "xảy ra với mình?"
                ),
                "B": (
                    "Đâu là những khả năng gây nên những khó khăn này? Tại sao nó lại xảy ra? "
                    "Khó khăn này xuất phát từ ai? Khi nào thì nó thường xảy ra và xảy ra ở đâu? "
                    "Tần suất xảy ra có thường xuyên không?"
                ),
                "C": (
                    "Phải có ai đó chịu trách nhiệm về vấn đề này, người đó là ai? Ai là người "
                    "phải giải quyết hậu quả của nó? Làm sao hạn chế hậu quả của nó nếu nó còn "
                    "xảy ra trong tương lai? Có cần sự tác động của cấp quản lý không?"
                ),
                "D": (
                    "Chuyện này cứ xảy ra mãi, khi nào thì tình trạng này sẽ chấm dứt? Làm thế "
                    "nào để nó không xảy ra trong tương lai? Liệu vấn đề này có liên quan đến "
                    "văn hóa làm việc của ngân hàng hay không?"
                ),
            }
        },
        "VTT10.46": {
            "options": {
                "A": (
                    "Bạn A không phân tích mà đã vội vã kết luận, như vậy là hơi vội vã, vì việc "
                    "hạn chế sai sót không đơn giản được giải quyết bằng cách nâng cao năng lực "
                    "nghiệp vụ của nhân viên mà còn phụ thuộc vào các yếu tố khác dựa trên việc "
                    "phân tích nguyên nhân, ví dụ: chính sách kiểm soát, các quy trình quy định "
                    "phù hợp, các yếu tố động lực..."
                ),
                "B": (
                    "Bạn A hoàn toàn chính xác. Nâng cao năng lực nghiệp vụ của nhân viên là cách "
                    "duy nhất hạn chế những sai sót trong khi tác nghiệp."
                ),
                "C": "Bạn A là người thiên về tổng hợp hơn là phân tích",
                "D": (
                    "Bạn A đúng vì đây là giải pháp hiển nhiên có thể trả lời mà không cần phải "
                    "suy nghĩ"
                ),
            }
        },
    }
    for question in questions:
        question.update(corrections.get(question["id"], {}))

    if len(questions) != 340:
        raise ValueError(f"Expected 340 questions, extracted {len(questions)}")
    return questions


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    questions = extract(args.pdf)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(questions, ensure_ascii=False, indent=2)
    args.output.write_text(
        "// Generated from the supplied PDF. Do not edit by hand.\n"
        f"export const QUESTION_BANK = Object.freeze({payload});\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(questions)} questions to {args.output}")


if __name__ == "__main__":
    main()
