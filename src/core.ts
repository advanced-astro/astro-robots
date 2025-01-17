import type { RobotsConfig } from ".";

import { logger } from "./utils";

function validateHost(host: string) {

  const hostPattern = /^(?=.{1,253}$)(?:(?!-)[a-zA-Z0-9-]{1,63}(?<!-)\.)+[a-zA-Z]{2,63}$/;

  if (typeof host !== 'string') {
    throwMsg('Host must be a string', 'error');
  }

  if (!hostPattern.test(host)) {
    throwMsg('Host is invalid', 'error')
  }

}

function generateHostContent(config: RobotsConfig) {
  let content = '';

  if (config.host === true) {
    // use default host
  } else if (config.host === false) {
    // do not specify host
  } else if (typeof config.host === 'number') {
    validateHost(config.host);
  } else if (typeof config.host === 'string' && config.host !== 'localhost') {
    validateHost(config.host);

    content += `Host: ${config.host}\n`;
  }

  return content;
}

function validateUrl(url: string) {
  // const urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*\.(xml|txt|html)$/;
  const urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*\.(xml|txt|html|xml.gz|txt.gz|json|xhtml)$/i;
  if (!urlPattern.test(url)) {
    throwMsg(`sitemap [URL is invalid or not a valid sitemap file.]`, true)
  }
}

function generateSitemapContent(config: RobotsConfig, siteHref: string) {

  let content = '';

  if (config.sitemap === true) {
    content += `Sitemap: ${siteHref}sitemap-index.xml\n`;
  } else if (typeof config.sitemap === 'number') {
    throwMsg(`sitemap [URL is invalid or not a valid sitemap file.]`, true)
  } else if (typeof config.sitemap === 'string') {
    validateUrl(config.sitemap);
    content += `Sitemap: ${config.sitemap}\n`;
  } else if (Array.isArray(config.sitemap)) {
    for (let url of config.sitemap) {
      validateUrl(url);
      content += `Sitemap: ${url}\n`;
    }
  }

  return content;

}

function throwMsg(msg: string, type: boolean | 'warn' | 'error' | 'info') {
  const sentenceHead = `\x1b[1mRefer:\x1b[22m`;

  const failured = (message: string) => {
    logger.info(`\x1b[31mFailured!\x1b[39m`);
  };

  const warn = (message: string) => {
    logger.warn(`Skiped! [${message}].`);
  };

  switch (type) {
    case 'warn':
      warn(msg);
      break;
    case 'error':
      failured(msg);
      throw new Error(`${msg}`);
    case true:
      failured(msg);
      throw new Error(`${msg}\n${sentenceHead}\n  Visit \x1b[4m${`https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt#useful-robots.txt-rules`}\x1b[24m for instructions.`);
    default:
      failured(msg);
      throw new Error(`${msg}\n${sentenceHead}\n  Visit \x1b[4m${`https://yandex.com/support/webmaster/controlling-robot/robots-txt.html#recommend`}\x1b[24m for instructions.`);
  }
}

export function generateContent(config: RobotsConfig, siteMapHref: string): string {
  let content = '';

  for (const policy of config.policy ?? []) {

    // Basic validate
    config?.policy?.forEach((policy, index) => {

      if (!policy.userAgent) {
        throwMsg(

          `policy[${index}].userAgent [Required, one or more per group].\n${JSON.stringify(policy, null, 2)}`,
          (!!policy.userAgent)
        );
      }

      if ((!policy.allow && !policy.disallow) || (policy.allow?.length === 0 && policy.disallow?.length === 0)) {
        throwMsg(

          `policy[${index}] [At least one or more 'disallow' or 'allow' entries per rule].\n${JSON.stringify(policy, null, 2)}`,
          (!policy.allow && !policy.disallow)
        );
      }

      if (policy.crawlDelay && typeof policy.crawlDelay !== 'number') {
        throwMsg(`policy[${index}].crawlDelay [Must be number].\n${JSON.stringify(policy, null, 2)}`, false);
      } else if (policy.crawlDelay !== undefined && policy?.crawlDelay < 0) {
        throwMsg(`policy[${index}].crawlDelay [Must be a positive number].\n${JSON.stringify(policy, null, 2)}`, false);
      } else if (policy.crawlDelay !== undefined && (policy?.crawlDelay < 0.1 || policy.crawlDelay > 60)) {
        throwMsg(`policy[${index}].crawlDelay [Must be between 0.1 and 60 seconds].\n${JSON.stringify(policy, null, 2)}`, false);
      }

    });

    if (policy.userAgent) {
      const userAgents = Array.isArray(policy.userAgent) ? policy.userAgent : [policy.userAgent || '*'];
      for (const userAgent of userAgents) {
        // skiped
        if (userAgent) {
          content += `User-agent: ${userAgent}\n`;
        }
      }
    }

    if (policy.allow) {
      const allowPaths = Array.isArray(policy.allow) ? policy.allow : [policy.allow];
      for (const path of allowPaths) {
        content += `Allow: ${path}\n`;
      }
    }

    if (policy.disallow) {
      const disallowPaths = Array.isArray(policy.disallow) ? policy.disallow : [policy.disallow];
      for (const path of disallowPaths) {
        content += `Disallow: ${path}\n`;
      }
    }

    if (policy.crawlDelay) {
      content += `Crawl-delay: ${policy.crawlDelay}\n`;
    }

    if (policy.cleanParam) {
      const cleanParams = Array.isArray(policy.cleanParam) ? policy.cleanParam : [policy.cleanParam];
      for (const param of cleanParams) {
        content += `Clean-param: ${param}\n`;
      }
    }

    if (config.policy && policy !== config.policy[config.policy.length - 1]) {
      content += `\n`
    } else if (config.sitemap !== false) {
      content += `\n# crawling rule(s) for above bots\n`
    }

  }

  content += generateSitemapContent(config, siteMapHref);
  content += generateHostContent(config);

  return content;
}

export function printInfo(fileSize: number, executionTime: number) {

  logger.info(`\x1b[2mCompleted in ${executionTime}ms\x1b[22m`);

  if (fileSize > 10) {
    console.log(`\n\x1b[42m generating 'robots.txt' file \x1b[0m`);
    const warnMsg = [
      `\n\x1b[33m(!) Keep your 'robots.txt' file size under 10 KB for best crawling results.`,
      `- To keep it low, only include directives that are necessary for your site.`,
      `- Remove rules for pages that no longer exist to avoid bloat.\x1b[0m\n`,
    ]
    console.log(`${warnMsg.join('\n')}`);
  }

  logger.success(`\x1b[32mgenerated\x1b[0m 'robots.txt' ${fileSize} KB`);
}
