# Riffmax target sites — the URLs we scrape for industry pattern learning.
# Organized by niche. Slugs are used as the "niche" column in scrape_results.
# Keep niche slugs in lower snake_case.

SCRAPE_TARGETS: dict[str, list[str]] = {
    "saas": [
        "https://linear.app",
        "https://notion.so",
        "https://vercel.com",
        "https://stripe.com",
        "https://figma.com",
        "https://loom.com",
        "https://retool.com",
        "https://airtable.com",
        "https://intercom.com",
        "https://webflow.com",
    ],
    "law_firm": [
        "https://www.weil.com",
        "https://www.skadden.com",
        "https://www.lw.com",
        "https://www.kirkland.com",
        "https://www.paulweiss.com",
        "https://www.sullcrom.com",
        "https://www.debevoise.com",
        "https://www.whitecase.com",
    ],
    "restaurant": [
        "https://www.noburestaurants.com",
        "https://www.sweetgreen.com",
        "https://www.shakeshack.com",
        "https://www.chipotle.com",
        "https://www.thefatduck.co.uk",
        "https://www.massesrestaurant.com",
        "https://www.eleven11madison.com",
        "https://www.unionfare.com",
    ],
    "fintech": [
        "https://www.revolut.com",
        "https://www.chime.com",
        "https://www.robinhood.com",
        "https://www.coinbase.com",
        "https://www.brex.com",
        "https://www.mercury.com",
        "https://www.plaid.com",
        "https://www.wise.com",
        "https://www.affirm.com",
        "https://www.klarna.com",
    ],
    "social_media": [
        "https://www.bereal.com",
        "https://www.discord.com",
        "https://www.reddit.com",
        "https://www.pinterest.com",
        "https://www.snapchat.com",
        "https://www.tumblr.com",
        "https://www.mastodon.social",
        "https://www.threads.net",
    ],
    "dating_apps": [
        "https://www.hinge.co",
        "https://www.bumble.com",
        "https://www.match.com",
        "https://www.eharmony.com",
        "https://www.okcupid.com",
        "https://www.tinder.com",
        "https://www.zoosk.com",
        "https://www.hily.com",
    ],
    "ecommerce": [
        "https://www.allbirds.com",
        "https://www.gymshark.com",
        "https://www.glossier.com",
        "https://www.warbyparker.com",
        "https://www.casper.com",
        "https://www.mvmtwatches.com",
        "https://www.brooklinen.com",
        "https://www.bombas.com",
    ],
    "portfolio": [
        "https://www.awwwards.com",
        "https://www.dribbble.com",
        "https://www.behance.net",
        "https://www.superhi.com",
        "https://www.studiofreight.com",
        "https://www.activetheory.net",
        "https://www.unfold.no",
        "https://www.hello-monday.com",
    ],
}


def get_all_niches() -> list[str]:
    return list(SCRAPE_TARGETS.keys())


def get_niche_targets(niche: str) -> list[str]:
    return list(SCRAPE_TARGETS.get(niche, []))


def total_target_count() -> int:
    return sum(len(urls) for urls in SCRAPE_TARGETS.values())
