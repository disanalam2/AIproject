from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('https://mhj-marketing.web.app/')
        page.fill('#staticrypt-password', 'MHJ@ADMIN@INTERN@DISANALAM')
        page.click('input[type="submit"]')
        page.wait_for_timeout(2000)
        content = page.evaluate('document.body.innerText')
        print(content)
        browser.close()

if __name__ == '__main__':
    run()
